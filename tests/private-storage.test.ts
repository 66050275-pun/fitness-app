import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB, IDBObjectStore } from 'fake-indexeddb';
import { privateStorage, createPrivateVault, unlockPrivateVault, lockPrivateStorage,
  flushPrivateStorage, retryPrivateStorage, encryptedBackup, restoreEncryptedBackup, VAULT_DB, PHOTO_KEY } from '../src/services/privateStorage.ts';
import { escapeHtml, htmlJsArg } from '../src/utils/sanitize.ts';
const legacy = new Map<string, string>();
Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: indexedDB });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (name: string) => legacy.get(name) ?? null,
  removeItem: (name: string) => legacy.delete(name),
  setItem: (name: string, value: string) => legacy.set(name, value),
}});
const passphrase = 'test-only-long-passphrase-2026';
async function record() {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(VAULT_DB, 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction('vault', 'readonly'); const req = tx.objectStore('vault').get('current');
    tx.oncomplete = () => { db.close(); resolve(req.result); }; tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
async function replaceRecord(value: unknown) {
  const req = indexedDB.open(VAULT_DB, 1);
  await new Promise<void>((resolve, reject) => {
    req.onsuccess = () => {
      const tx = req.result.transaction('vault', 'readwrite'); tx.objectStore('vault').put(value, 'current');
      tx.oncomplete = () => { req.result.close(); resolve(); }; tx.onabort = () => { req.result.close(); reject(tx.error); };
    };
    req.onerror = () => reject(req.error);
  });
}
async function removeVault() { await new Promise<void>((resolve, reject) => { const req = indexedDB.deleteDatabase(VAULT_DB); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); }); }

test('vault encryption, migration, recovery, conflicts and failure handling', async () => {
  assert.throws(() => privateStorage.getItem('profile'), /Unlock/);
  legacy.set('nutriai_app_data_v2', '{"displayName":"PRIVATE-TEST-NAME","weight":64}');
  legacy.set('unrelated_application', 'leave-alone');
  const photoDB = await new Promise<IDBDatabase>(resolve => {
    const req = indexedDB.open('nutriai_profile_db', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('profile_images');
    req.onsuccess = () => resolve(req.result);
  });
  await new Promise<void>(resolve => {
    const tx = photoDB.transaction('profile_images', 'readwrite');
    tx.objectStore('profile_images').put(new Blob(['private-photo']), 'current_profile_photo');
    tx.oncomplete = () => { photoDB.close(); resolve(); };
  });
  await assert.rejects(createPrivateVault('short'), /12/);
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () { throw new DOMException('Test quota', 'QuotaExceededError'); };
  await assert.rejects(createPrivateVault(passphrase));
  assert.ok(legacy.has('nutriai_app_data_v2'), 'plaintext is preserved until encrypted migration commits');
  IDBObjectStore.prototype.put = originalPut;
  await createPrivateVault(passphrase);
  assert.equal(legacy.has('nutriai_app_data_v2'), false);
  assert.equal(legacy.get('unrelated_application'), 'leave-alone');
  assert.ok(privateStorage.getItem(PHOTO_KEY));
  assert.ok(privateStorage.getItem('nutriai_app_data_v2')?.includes('PRIVATE-TEST-NAME'));
  const first = await record();
  assert.ok(!JSON.stringify(first).includes('PRIVATE-TEST-NAME'));
  assert.ok(!JSON.stringify(first).includes(passphrase));
  privateStorage.setItem('profile', 'PRIVATE-TEST-EMAIL'); await flushPrivateStorage();
  const second = await record(); assert.notEqual(first.iv, second.iv);
  assert.ok(!JSON.stringify(second).includes('PRIVATE-TEST-EMAIL'));
  await lockPrivateStorage(); assert.throws(() => privateStorage.getItem('profile'), /Unlock/);
  await assert.rejects(unlockPrivateVault('wrong-passphrase'), /Incorrect/);
  assert.deepEqual(await record(), second, 'wrong password never modifies ciphertext');
  const tampered = { ...second, ciphertext: second.ciphertext.slice(0, -8) + 'AAAAAAAA' };
  await replaceRecord(tampered);
  await assert.rejects(unlockPrivateVault(passphrase), /damaged/);
  await replaceRecord(second); await unlockPrivateVault(passphrase);
  assert.equal(privateStorage.getItem('profile'), 'PRIVATE-TEST-EMAIL');
  // An independently loaded module simulates a second tab with its own key and snapshot.
  const tab = await import('../src/services/privateStorage.ts?second-tab');
  await tab.unlockPrivateVault(passphrase);
  privateStorage.setItem('profile', 'FIRST-TAB-UPDATE'); await flushPrivateStorage();
  tab.privateStorage.setItem('profile', 'SECOND-TAB-UPDATE');
  await assert.rejects(tab.flushPrivateStorage());
  assert.notEqual((await record()).ciphertext, JSON.parse(await tab.encryptedBackup()).ciphertext);
  assert.equal(privateStorage.getItem('profile'), 'FIRST-TAB-UPDATE');
  // Quota errors must be visible; emergency backups still include unsaved changes encrypted.
  IDBObjectStore.prototype.put = function () { throw new DOMException('Test quota', 'QuotaExceededError'); };
  privateStorage.setItem('profile', 'UNSAVED-PRIVATE-DATA');
  await assert.rejects(flushPrivateStorage()); await assert.rejects(lockPrivateStorage());
  const emergency = await encryptedBackup(); assert.ok(!emergency.includes('UNSAVED-PRIVATE-DATA'));
  IDBObjectStore.prototype.put = originalPut;
  await retryPrivateStorage(); await lockPrivateStorage(); await removeVault();
  await restoreEncryptedBackup(emergency); await unlockPrivateVault(passphrase);
  assert.equal(privateStorage.getItem('profile'), 'UNSAVED-PRIVATE-DATA');
  assert.ok(privateStorage.getItem(PHOTO_KEY));
  privateStorage.removeItem('profile'); privateStorage.removeItem(PHOTO_KEY); await flushPrivateStorage();
  await lockPrivateStorage(); await unlockPrivateVault(passphrase);
  assert.equal(privateStorage.getItem('profile'), null); assert.equal(privateStorage.getItem(PHOTO_KEY), null);
  await lockPrivateStorage();
});

test('text and inline JavaScript arguments cannot break their contexts', () => {
  const attack = `');window.__injected=1;//\"<img src=x onerror=alert(1)>`;
  assert.ok(!escapeHtml(attack).includes('<img'));
  const encoded = htmlJsArg(attack);
  assert.ok(!encoded.includes('"')); assert.ok(!encoded.includes('<'));
  const decoded = encoded.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.equal(JSON.parse(decoded), attack);
});
