/** Passphrase protected local vault. No password or decryption key is persisted. */
export const VAULT_DB = 'nutriai_private_vault';
export const PHOTO_KEY = 'nutriai_private_photo';
const STORE = 'vault';
const RECORD_KEY = 'current';
const ITERATIONS = 600_000;
const LEGACY_KEYS = ['nutriai_app_data_v2', 'nutriai_meals', 'nutriai_workout_history',
  'nutriai_recent_food_searches', 'nutriai_insight_range', 'nutriai_dashboard_layout', 'nutriai_feedback_draft'];
const encoder = new TextEncoder();
const aad = encoder.encode('NutriAI private vault v1');
interface VaultRecord { version: 1; salt: string; iv: string; ciphertext: string; revision: number; }
let key: CryptoKey | null = null;
let record: VaultRecord | null = null;
let values: Record<string, string> = Object.create(null);
let generation = 0;
let savedGeneration = 0;
let pending: Promise<void> = Promise.resolve();
let failure: Error | null = null;
export type SaveStatus = 'locked' | 'saving' | 'saved' | 'error';
let status: SaveStatus = 'locked';
const listeners = new Set<(status: SaveStatus) => void>();
function report(next: SaveStatus) { status = next; listeners.forEach(fn => fn(next)); }
export function onSaveStatus(fn: (status: SaveStatus) => void) { listeners.add(fn); fn(status); return () => listeners.delete(fn); }
export function isVaultUnlocked() { return key !== null; }
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), c => c.charCodeAt(0));
}
async function openDB(): Promise<IDBDatabase> {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB) throw new Error('Secure browser storage is unavailable. Use HTTPS and allow browser storage.');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VAULT_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(new Error('Cannot open private storage.'));
    request.onblocked = () => reject(new Error('Close other NutriAI tabs and try again.'));
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
  });
}
async function readRecord(): Promise<VaultRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(RECORD_KEY);
    tx.oncomplete = () => { db.close(); resolve(request.result ?? null); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Cannot read private storage.')); };
  });
}
/** Compare and commit in the same transaction: another tab cannot silently overwrite data. */
async function commit(next: VaultRecord, expected: VaultRecord | null): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    let conflict = false;
    const storage = tx.objectStore(STORE);
    const request = storage.get(RECORD_KEY);
    request.onsuccess = () => {
      const current = request.result as VaultRecord | undefined;
      if (expected ? !current || current.revision !== expected.revision || current.ciphertext !== expected.ciphertext : !!current) {
        conflict = true; tx.abort(); return;
      }
      try { storage.put(next, RECORD_KEY); } catch { tx.abort(); }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error(conflict
      ? 'Another tab changed your vault. Keep this tab open; do not overwrite it. Export your data, then reload.'
      : 'Changes could not be saved. Storage may be full or blocked. Keep this tab open and retry.')); };
  });
}
async function derive(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encrypt(data: Record<string, string>, encryptionKey: CryptoKey, salt: string, revision: number): Promise<VaultRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, encryptionKey, encoder.encode(JSON.stringify(data)));
  return { version: 1, salt, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)), revision };
}
export async function vaultExists(): Promise<boolean> { return (await readRecord()) !== null; }
function requireUnlocked() { if (!key) throw new Error('Unlock your private vault first.'); }
function scheduleSave() {
  report('saving');
  pending = pending.then(async () => {
    if (savedGeneration === generation && !failure) return;
    requireUnlocked();
    const saving = generation;
    const next = await encrypt(values, key!, record!.salt, record!.revision + 1);
    await commit(next, record);
    record = next; savedGeneration = saving; failure = null;
    if (saving === generation) report('saved');
  }).catch(() => {
    failure = new Error('Private storage could not be saved. Retry or export before closing this tab. Another tab may have changed the vault.');
    report('error');
  });
}
/** Synchronous memory facade; only encrypted snapshots reach IndexedDB. */
export const privateStorage = {
  getItem(name: string): string | null { requireUnlocked(); return values[name] ?? null; },
  setItem(name: string, value: string): void { requireUnlocked(); values[name] = value; generation++; scheduleSave(); },
  removeItem(name: string): void { requireUnlocked(); delete values[name]; generation++; scheduleSave(); },
};
export async function flushPrivateStorage(): Promise<void> { await pending; if (failure) throw failure; }
export async function retryPrivateStorage(): Promise<void> { requireUnlocked(); scheduleSave(); await flushPrivateStorage(); }
export async function lockPrivateStorage(): Promise<void> {
  await flushPrivateStorage();
  key = null; record = null; values = Object.create(null); failure = null; report('locked');
}
async function legacyPhoto(): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nutriai_profile_db', 1);
    request.onerror = () => reject(new Error('Cannot migrate the old profile photo.'));
    request.onblocked = () => reject(new Error('Close other NutriAI tabs to migrate your photo.'));
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('profile_images')) { db.close(); resolve(null); return; }
      const tx = db.transaction('profile_images', 'readonly');
      const photo = tx.objectStore('profile_images').get('current_profile_photo');
      tx.oncomplete = () => { db.close(); resolve(photo.result instanceof Blob ? photo.result : null); };
      tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Cannot migrate the old profile photo.')); };
    };
  });
}
async function cleanLegacy(): Promise<void> {
  // Only this app's known legacy keys are touched.
  for (const name of LEGACY_KEYS) localStorage.removeItem(name);
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('nutriai_profile_db');
    request.onsuccess = () => resolve();
    request.onerror = request.onblocked = () => reject(new Error('Encrypted data is saved, but old photo cleanup failed. Close other NutriAI tabs and unlock again.'));
  });
}
export async function createPrivateVault(passphrase: string): Promise<void> {
  if (Array.from(passphrase).length < 12) throw new Error('Use a unique passphrase of at least 12 characters.');
  if (await vaultExists()) throw new Error('A vault already exists. Unlock it instead.');
  const migrated: Record<string, string> = Object.create(null);
  for (const name of LEGACY_KEYS) { const value = localStorage.getItem(name); if (value !== null) migrated[name] = value; }
  const photo = await legacyPhoto();
  if (photo) migrated[PHOTO_KEY] = toBase64(new Uint8Array(await photo.arrayBuffer()));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const newKey = await derive(passphrase, salt);
  const newRecord = await encrypt(migrated, newKey, toBase64(salt), 1);
  await commit(newRecord, null); // Must be durable BEFORE removing plaintext.
  await cleanLegacy();
  key = newKey; record = newRecord; values = migrated; generation = savedGeneration = 0; failure = null; report('saved');
}
export async function unlockPrivateVault(passphrase: string): Promise<void> {
  const stored = await readRecord();
  if (!stored || stored.version !== 1) throw new Error('Private vault is missing or unsupported.');
  let decoded: unknown;
  let newKey: CryptoKey;
  try {
    newKey = await derive(passphrase, fromBase64(stored.salt));
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(stored.iv), additionalData: aad }, newKey, fromBase64(stored.ciphertext));
    decoded = JSON.parse(new TextDecoder().decode(plaintext));
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded) || Object.values(decoded).some(v => typeof v !== 'string')) throw new Error();
  } catch { throw new Error('Incorrect passphrase or damaged vault. Your stored data has not been changed.'); }
  await cleanLegacy();
  key = newKey; record = stored; values = Object.assign(Object.create(null), decoded); generation = savedGeneration = 0; failure = null; report('saved');
}
/** Explicit encrypted archive, including the profile photo; never exports the key. */
export async function encryptedBackup(): Promise<string> {
  await pending; requireUnlocked();
  // Also backs up unsaved changes if IndexedDB is full or a concurrent tab won.
  const snapshot = await encrypt(values, key!, record!.salt, record!.revision + 1);
  return JSON.stringify({ format: 'nutriai-encrypted-vault', ...snapshot }, null, 2);
}
export async function restoreEncryptedBackup(text: string): Promise<void> {
  if (isVaultUnlocked() || await vaultExists()) throw new Error('Restore only into a browser without an existing vault.');
  if (LEGACY_KEYS.some(name => localStorage.getItem(name) !== null) || await legacyPhoto()) throw new Error('Existing local data must be migrated first. Create a vault to preserve it.');
  const candidate = JSON.parse(text);
  if (candidate.format !== 'nutriai-encrypted-vault' || candidate.version !== 1 ||
    typeof candidate.salt !== 'string' || fromBase64(candidate.salt).length !== 16 ||
    typeof candidate.iv !== 'string' || fromBase64(candidate.iv).length !== 12 ||
    typeof candidate.ciphertext !== 'string' || fromBase64(candidate.ciphertext).length < 16) throw new Error('Invalid encrypted backup.');
  await commit({ version: 1, salt: candidate.salt, iv: candidate.iv, ciphertext: candidate.ciphertext, revision: 1 }, null);
}
