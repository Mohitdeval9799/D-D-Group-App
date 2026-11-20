const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_DATA_URI_CHARS = 150000; // Safely below the 160,000-char Firestore rule bound

export interface OptimizedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  approxKb: number;
}

export async function compressProductImageFile(file: File): Promise<OptimizedImageResult> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP product image.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image file is too large. Please select a photo under 15 MB.');
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode this image file.'));
      el.src = bitmapUrl;
    });

    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || maxDim) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || maxDim) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas unavailable for image compression.');
    }

    // White matte ensures clean product presentation for transparent PNGs if JPEG fallback is used
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const qualities = [0.82, 0.72, 0.6, 0.48, 0.36];
    let bestUrl = '';

    for (const mime of ['image/webp', 'image/jpeg'] as const) {
      for (const q of qualities) {
        const candidate = canvas.toDataURL(mime, q);
        if (candidate.startsWith(`data:${mime};base64,`) && candidate.length <= MAX_DATA_URI_CHARS) {
          bestUrl = candidate;
          break;
        }
      }
      if (bestUrl) break;
    }

    if (!bestUrl) {
      // Final smaller resize pass for extremely dense photos
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = Math.max(1, Math.round(width * 0.65));
      smallCanvas.height = Math.max(1, Math.round(height * 0.65));
      const smallCtx = smallCanvas.getContext('2d');
      if (smallCtx) {
        smallCtx.fillStyle = '#ffffff';
        smallCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
        smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
        const fallback = smallCanvas.toDataURL('image/jpeg', 0.55);
        if (fallback.length <= MAX_DATA_URI_CHARS) {
          bestUrl = fallback;
        }
      }
    }

    if (!bestUrl) {
      throw new Error('Could not compress this image under 150 KB. Try a smaller photo or an HTTPS image URL.');
    }

    return {
      dataUrl: bestUrl,
      width,
      height,
      approxKb: Math.round((bestUrl.length * 0.75) / 1024),
    };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export function isValidProductImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.length > 160000) return false;
  return (
    /^https:\/\/.+/.test(trimmed) ||
    /^data:image\/(jpeg|png|webp);base64,.+/.test(trimmed)
  );
}
