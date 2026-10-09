/**
 * Profile Image Storage — IndexedDB-backed
 *
 * Strategy:
 * - Store the compressed Blob in IndexedDB ('nutriai_profile_images' store)
 * - Create ONE object URL when loading the active profile image
 * - Keep the URL in app state (managed centrally by the Store)
 * - Revoke the previous URL ONLY when replacing, deleting, or disposing
 * - Do NOT revoke on every HTML-string rerender
 * - Do NOT create a new object URL every render cycle
 * - Handle IndexedDB unavailable/quota gracefully with fallback
 * - Remove orphaned images when user deletes photo or clears all data
 *
 * The caller (Store) is responsible for:
 * 1. Calling loadProfileImage() once at startup
 * 2. Storing the returned URL in state.profileImageUrl
 * 3. Revoking old URL before setting a new one via replaceProfileImageUrl()
 */

const DB_NAME = 'nutriai_profile_db';
const DB_VERSION = 1;
const STORE_NAME = 'profile_images';
const IMAGE_KEY = 'current_profile_photo';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max input
const MAX_DIMENSION = 512;
const OUTPUT_QUALITY = 0.85;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a File for use as a profile image.
 * Checks MIME type and file size.
 */
export function validateProfileImage(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Please select a JPG, PNG, or WebP image' };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const maxMB = Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024));
    return { valid: false, error: `Image must be smaller than ${maxMB} MB` };
  }

  return { valid: true };
}

// ─── Resize / Compress ────────────────────────────────────────────────────────

/**
 * Resizes and compresses a File to a max 512×512 JPEG Blob.
 * Uses center-crop to produce a square image.
 */
export function resizeProfileImage(file: File, maxSize: number = MAX_DIMENSION): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Center crop to square
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - minDim) / 2;
      const sy = (img.naturalHeight - minDim) / 2;

      const outputSize = Math.min(maxSize, minDim);

      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, outputSize, outputSize);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        OUTPUT_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ─── IndexedDB Operations ─────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a compressed Blob to IndexedDB.
 * Returns the key used for storage.
 */
export async function saveProfileImage(blob: Blob): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(blob, IMAGE_KEY);
    req.onsuccess = () => resolve(IMAGE_KEY);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Loads the profile image Blob from IndexedDB.
 * Returns null if no image is stored or IndexedDB is unavailable.
 * The caller should create an object URL from the returned Blob.
 */
export async function loadProfileImageBlob(): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(IMAGE_KEY);
      req.onsuccess = () => {
        const blob = req.result;
        resolve(blob instanceof Blob ? blob : null);
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * Deletes the profile image from IndexedDB.
 */
export async function deleteProfileImage(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(IMAGE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Silently handle if DB is unavailable
  }
}

/**
 * Deletes the entire IndexedDB database for cleanup.
 */
export async function deleteProfileImageDB(): Promise<void> {
  try {
    if (typeof indexedDB === 'undefined') return;
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  } catch {
    // Silently handle
  }
}
