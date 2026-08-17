const MAX_DIMENSION = 2000;

/** Normalize camera uploads (HEIC/large photos) into a JPEG blob Tesseract can read. */
export async function preprocessImageForOcr(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Could not read this image format. Try JPG or PNG.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not prepare image for scanning.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9),
  );

  if (!blob) {
    throw new Error('Could not convert image for scanning.');
  }

  return blob;
}

export function formatScanError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Scan failed. Please retake the photo or use manual entry.';
}
