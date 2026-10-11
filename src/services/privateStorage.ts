/** PIN-protected local vault. Credentials and decryption keys are never persisted. */
export const VAULT_DB = 'nutriai_private_vault';
export const PHOTO_KEY = 'nutriai_private_photo';
const STORE = 'vault';
const RECORD_KEY = 'current';
const ITERATIONS = 800_000;
const LEGACY_ITERATIONS = 600_000;
const ACCESS_KEY = 'access';
const ATTEMPT_LEASE_MS = 120_000;
const LEGACY_KEYS = ['nutriai_app_data_v2', 'nutriai_meals', 'nutriai_workout_history',
  'nutriai_recent_food_searches', 'nutriai_insight_range', 'nutriai_dashboard_layout', 'nutriai_feedback_draft'];
const encoder = new TextEncoder();
const aad = encoder.encode('NutriAI private vault v1');
interface VaultRecord {
  version: 1; salt: string; iv: string; ciphertext: string; revision: number;
  credentialType?: 'pin' | 'passphrase'; iterations?: number;
}
interface AccessMetadata {
  salt: string; failedAttempts: number; lockedUntil: number;
  inFlight: { token: string; expiresAt: number } | null;
}
export interface VaultAccessState {
  exists: boolean; requiresPassphraseMigration: boolean; failedAttempts: number; lockedUntil: number;
}
export class VaultAttemptError extends Error {
  constructor(public readonly failedAttempts: number, public readonly lockedUntil: number, legacy = false) {
    super(legacy ? 'Incorrect passphrase or damaged vault. Your stored data has not been changed.'
      : 'Incorrect passcode or damaged vault. Your stored data has not been changed.');
    this.name = 'VaultAttemptError';
  }
}
export class VaultLockoutError extends Error {
  constructor(public readonly failedAttempts: number, public readonly lockedUntil: number) {
    super('Too many attempts. Try again after the lockout.');
    this.name = 'VaultLockoutError';
  }
}
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
    tx.oncomplete = () => {
      db.close();
      try { resolve(request.result == null ? null : validateRecord(request.result)); }
      catch (error) { reject(error); }
    };
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
function validatePin(pin: string): void {
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) throw new Error('Enter exactly 6 numeric digits.');
}
/** Old v1 archives omitted KDF metadata and always used 600,000 iterations. */
function validateRecord(candidate: unknown): VaultRecord {
  if (!candidate || typeof candidate !== 'object') throw new Error('Invalid encrypted backup.');
  const value = candidate as Partial<VaultRecord>;
  const pin = value.credentialType === 'pin';
  if (value.version !== 1 || typeof value.salt !== 'string' || fromBase64(value.salt).length !== 16 ||
    typeof value.iv !== 'string' || fromBase64(value.iv).length !== 12 ||
    typeof value.ciphertext !== 'string' || fromBase64(value.ciphertext).length < 16 ||
    (value.credentialType !== undefined && value.credentialType !== 'pin' && value.credentialType !== 'passphrase') ||
    (pin ? !Number.isInteger(value.iterations) || value.iterations! < LEGACY_ITERATIONS || value.iterations! > ITERATIONS
      : value.iterations !== undefined && value.iterations !== LEGACY_ITERATIONS)) throw new Error('Invalid encrypted backup.');
  return { version: 1, salt: value.salt, iv: value.iv, ciphertext: value.ciphertext,
    revision: Number.isSafeInteger(value.revision) && value.revision! >= 1 ? value.revision! : 1,
    ...(value.credentialType === undefined ? {} : { credentialType: value.credentialType }),
    ...(value.iterations === undefined ? {} : { iterations: value.iterations }) };
}
async function derive(secret: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encrypt(data: Record<string, string>, encryptionKey: CryptoKey, salt: string, revision: number,
  credentials: Pick<VaultRecord, 'credentialType' | 'iterations'>): Promise<VaultRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, encryptionKey, encoder.encode(JSON.stringify(data)));
  return { version: 1, salt, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)), revision, ...credentials };
}
export async function vaultExists(): Promise<boolean> { return (await readRecord()) !== null; }
function delayFor(attempts: number): number { return attempts >= 5 ? 300_000 : attempts >= 3 ? 30_000 : 0; }
function emptyAccess(salt: string): AccessMetadata { return { salt, failedAttempts: 0, lockedUntil: 0, inFlight: null }; }
function accessMetadata(raw: unknown, salt: string): AccessMetadata {
  if (!raw || typeof raw !== 'object' || (raw as AccessMetadata).salt !== salt) return emptyAccess(salt);
  const value = raw as AccessMetadata;
  if (!Number.isSafeInteger(value.failedAttempts) || value.failedAttempts < 0 ||
    !Number.isSafeInteger(value.lockedUntil) || value.lockedUntil < 0 ||
    (value.inFlight !== null && (!value.inFlight || typeof value.inFlight.token !== 'string' ||
      !Number.isSafeInteger(value.inFlight.expiresAt)))) throw new Error('Cannot read private storage.');
  // Closing a tab mid-attempt cannot evade the counter; abandoned attempts expire.
  if (value.inFlight && value.inFlight.expiresAt <= Date.now()) {
    value.failedAttempts++; value.lockedUntil = Date.now() + delayFor(value.failedAttempts); value.inFlight = null;
  }
  return value;
}
/** Metadata mutations serialize across tabs. No credentials or private data enter this record. */
async function updateAccess(stored: VaultRecord, mutate: (state: AccessMetadata) => void,
  replacement?: VaultRecord): Promise<AccessMetadata> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const storage = tx.objectStore(STORE);
    let problem: unknown;
    let result: AccessMetadata;
    const current = storage.get(RECORD_KEY);
    current.onsuccess = () => {
      const latest = current.result as VaultRecord | undefined;
      if (!latest || latest.revision !== stored.revision || latest.ciphertext !== stored.ciphertext) {
        problem = new Error('Vault changed during unlock. Try again.'); tx.abort(); return;
      }
      const request = storage.get(ACCESS_KEY);
      request.onsuccess = () => {
        try {
          result = accessMetadata(request.result, stored.salt); mutate(result);
          if (replacement) { storage.put(replacement, RECORD_KEY); result = emptyAccess(replacement.salt); }
          storage.put(result, ACCESS_KEY);
        } catch (error) {
          problem = error;
          // Persist an expired lease's failure/cooldown even when this attempt is blocked.
          if (error instanceof VaultLockoutError) storage.put(result!, ACCESS_KEY);
          else tx.abort();
        }
      };
    };
    tx.oncomplete = () => { db.close(); if (problem) reject(problem); else resolve(result!); };
    tx.onabort = tx.onerror = () => { db.close(); reject(problem ?? new Error('Cannot read private storage.')); };
  });
}
export async function getVaultAccessState(): Promise<VaultAccessState> {
  const stored = await readRecord();
  if (!stored) return { exists: false, requiresPassphraseMigration: false, failedAttempts: 0, lockedUntil: 0 };
  const state = await updateAccess(stored, () => {});
  return { exists: true, requiresPassphraseMigration: stored.credentialType !== 'pin',
    failedAttempts: state.failedAttempts, lockedUntil: Math.max(state.lockedUntil, state.inFlight?.expiresAt ?? 0) };
}
async function beginAttempt(stored: VaultRecord): Promise<string> {
  const token = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  await updateAccess(stored, state => {
    if (state.lockedUntil > Date.now()) throw new VaultLockoutError(state.failedAttempts, state.lockedUntil);
    if (state.inFlight) throw new VaultLockoutError(state.failedAttempts, state.inFlight.expiresAt);
    state.inFlight = { token, expiresAt: Date.now() + ATTEMPT_LEASE_MS };
  });
  return token;
}
async function finishAttempt(stored: VaultRecord, token: string, outcome: 'success' | 'failure' | 'cancel',
  replacement?: VaultRecord): Promise<AccessMetadata> {
  return updateAccess(stored, state => {
    if (state.inFlight?.token !== token) throw new Error('Unlock attempt expired. Try again.');
    state.inFlight = null;
    if (outcome === 'success') { state.failedAttempts = 0; state.lockedUntil = 0; }
    if (outcome === 'failure') { state.failedAttempts++; state.lockedUntil = Date.now() + delayFor(state.failedAttempts); }
  }, replacement);
}
async function authenticate(secret: string, stored: VaultRecord): Promise<{
  decoded: Record<string, string>; encryptionKey: CryptoKey; token: string;
}> {
  const token = await beginAttempt(stored);
  try {
    const encryptionKey = await derive(secret, fromBase64(stored.salt), stored.iterations ?? LEGACY_ITERATIONS);
    let plaintext: ArrayBuffer;
    try {
      plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(stored.iv), additionalData: aad },
        encryptionKey, fromBase64(stored.ciphertext));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'OperationError') {
        const state = await finishAttempt(stored, token, 'failure');
        throw new VaultAttemptError(state.failedAttempts, state.lockedUntil, stored.credentialType !== 'pin');
      }
      throw error;
    }
    const decoded: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded) ||
      Object.values(decoded).some(value => typeof value !== 'string')) throw new Error('Invalid encrypted backup.');
    return { decoded: Object.assign(Object.create(null), decoded) as Record<string, string>, encryptionKey, token };
  } catch (error) {
    if (!(error instanceof VaultAttemptError)) await finishAttempt(stored, token, 'cancel').catch(() => {});
    throw error;
  }
}
function openVault(stored: VaultRecord, encryptionKey: CryptoKey, decoded: Record<string, string>): void {
  key = encryptionKey; record = stored; values = decoded;
  generation = savedGeneration = 0; failure = null; report('saved');
}
function requireUnlocked() { if (!key) throw new Error('Unlock your private vault first.'); }
function scheduleSave() {
  report('saving');
  pending = pending.then(async () => {
    if (savedGeneration === generation && !failure) return;
    requireUnlocked();
    const saving = generation;
    const next = await encrypt(values, key!, record!.salt, record!.revision + 1,
      { credentialType: record!.credentialType, iterations: record!.iterations });
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
export async function createPrivateVault(pin: string): Promise<void> {
  validatePin(pin);
  if (key) throw new Error('Lock your private vault before opening it again.');
  if (await vaultExists()) throw new Error('A vault already exists. Unlock it instead.');
  const migrated: Record<string, string> = Object.create(null);
  for (const name of LEGACY_KEYS) { const value = localStorage.getItem(name); if (value !== null) migrated[name] = value; }
  const photo = await legacyPhoto();
  if (photo) migrated[PHOTO_KEY] = toBase64(new Uint8Array(await photo.arrayBuffer()));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const newKey = await derive(pin, salt, ITERATIONS);
  const newRecord = await encrypt(migrated, newKey, toBase64(salt), 1, { credentialType: 'pin', iterations: ITERATIONS });
  await commit(newRecord, null); // Must be durable BEFORE removing plaintext.
  await cleanLegacy();
  openVault(newRecord, newKey, migrated);
}
export async function unlockPrivateVault(pin: string): Promise<void> {
  validatePin(pin);
  if (key) throw new Error('Lock your private vault before opening it again.');
  const stored = await readRecord();
  if (!stored || stored.version !== 1) throw new Error('Private vault is missing or unsupported.');
  if (stored.credentialType !== 'pin') throw new Error('This vault uses a passphrase. Upgrade it to a PIN first.');
  const result = await authenticate(pin, stored);
  await finishAttempt(stored, result.token, 'success');
  await cleanLegacy();
  openVault(stored, result.encryptionKey, result.decoded);
}
/** Preserve old v1 data until a replacement PIN ciphertext is durably committed. */
export async function migratePassphraseVault(passphrase: string, pin: string): Promise<void> {
  validatePin(pin);
  if (key) throw new Error('Lock your private vault before opening it again.');
  const stored = await readRecord();
  if (!stored) throw new Error('Private vault is missing or unsupported.');
  if (stored.credentialType === 'pin') throw new Error('This vault already uses a PIN.');
  const result = await authenticate(passphrase, stored);
  let newKey: CryptoKey;
  let next: VaultRecord;
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    newKey = await derive(pin, salt, ITERATIONS);
    next = await encrypt(result.decoded, newKey, toBase64(salt), stored.revision + 1,
      { credentialType: 'pin', iterations: ITERATIONS });
    await finishAttempt(stored, result.token, 'success', next);
  } catch (error) {
    await finishAttempt(stored, result.token, 'cancel').catch(() => {}); throw error;
  }
  await cleanLegacy();
  openVault(next, newKey, result.decoded);
}
/** Explicit encrypted archive, including the profile photo; never exports the key. */
export async function encryptedBackup(): Promise<string> {
  await pending; requireUnlocked();
  // Also backs up unsaved changes if IndexedDB is full or a concurrent tab won.
  const snapshot = await encrypt(values, key!, record!.salt, record!.revision + 1,
    { credentialType: record!.credentialType, iterations: record!.iterations });
  return JSON.stringify({ format: 'nutriai-encrypted-vault', ...snapshot }, null, 2);
}
export async function restoreEncryptedBackup(text: string): Promise<void> {
  if (isVaultUnlocked() || await vaultExists()) throw new Error('Restore only into a browser without an existing vault.');
  if (LEGACY_KEYS.some(name => localStorage.getItem(name) !== null) || await legacyPhoto()) throw new Error('Existing local data must be migrated first. Create a vault to preserve it.');
  const candidate: unknown = JSON.parse(text);
  if (!candidate || typeof candidate !== 'object' ||
    (candidate as { format?: unknown }).format !== 'nutriai-encrypted-vault') throw new Error('Invalid encrypted backup.');
  const restored = validateRecord(candidate);
  await commit({ ...restored, revision: 1 }, null);
}
