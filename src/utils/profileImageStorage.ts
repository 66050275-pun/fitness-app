import { tr } from '../i18n/index.ts';
/**
 * Profile photos are cropped/compressed in the browser, stripping original metadata.
 * Only encrypted photo bytes reach IndexedDB through the shared private vault.
 * The Store owns the decrypted Blob URL and revokes it on replacement or lock.
 */

import { privateStorage, PHOTO_KEY, toBase64, fromBase64, flushPrivateStorage } from '../services/privateStorage.ts';

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
    return { valid: false, error: tr("No file selected") };
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: tr("Please select a JPG, PNG, or WebP image") };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const maxMB = Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024));
    return { valid: false, error: tr("Image must be smaller than {0} MB", maxMB) };
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

// Photos use the same encrypted vault as health data.
export async function saveProfileImage(blob: Blob): Promise<string> {
  privateStorage.setItem(PHOTO_KEY, toBase64(new Uint8Array(await blob.arrayBuffer())));
  await flushPrivateStorage();
  return 'current_profile_photo';
}
export async function loadProfileImageBlob(): Promise<Blob | null> {
  const encoded = privateStorage.getItem(PHOTO_KEY);
  return encoded ? new Blob([fromBase64(encoded)], { type: 'image/jpeg' }) : null;
}
export async function deleteProfileImage(): Promise<void> {
  privateStorage.removeItem(PHOTO_KEY);
  await flushPrivateStorage();
}
export async function deleteProfileImageDB(): Promise<void> { await deleteProfileImage(); }
