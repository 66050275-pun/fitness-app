const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;

async function decodePhoto(file: File): Promise<{ image: CanvasImageSource; width: number; height: number; close(): void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error('This photo could not be opened. Try another image.'));
      image.src = url;
    });
    return { image, width: image.naturalWidth, height: image.naturalHeight, close: () => { image.src = ''; } };
  } finally { URL.revokeObjectURL(url); }
}

/** Local rasterization strips original EXIF/filename and bounds the image sent to a future backend. */
export async function prepareFoodPhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo.');
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw new Error('Choose a photo smaller than 12 MB.');
  let decoded: Awaited<ReturnType<typeof decodePhoto>>;
  try { decoded = await decodePhoto(file); }
  catch { throw new Error('This photo could not be opened. Try another image.'); }
  try {
    if (!decoded.width || !decoded.height || decoded.width * decoded.height > 40_000_000
      || decoded.width > 12_000 || decoded.height > 12_000) throw new Error('This photo is too large to process. Choose a smaller image.');
    const ratio = Math.min(1, MAX_IMAGE_SIDE / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(decoded.width * ratio)); canvas.height = Math.max(1, Math.round(decoded.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This photo could not be opened. Try another image.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(decoded.image, 0, 0, canvas.width, canvas.height);
    const photo = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob
      ? resolve(blob) : reject(new Error('This photo could not be opened. Try another image.')), 'image/jpeg', 0.85));
    canvas.width = 0; canvas.height = 0;
    if (photo.size > 4 * 1024 * 1024) throw new Error('This photo is too large to process. Choose a smaller image.');
    return photo;
  } finally { decoded.close(); }
}
