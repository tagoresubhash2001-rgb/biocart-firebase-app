/**
 * Product photos under /assets/products/ also exist as much smaller .webp files (same name).
 * Product records store the .png path, so the swap happens here at display time, and every
 * caller falls back to the original .png if the .webp is ever missing.
 */
const OPTIMIZABLE = /^\/assets\/products\/[^/?#]+\.png$/i;

export function optimizedImage(src: string | undefined | null): string {
  if (!src) return src || '';
  return OPTIMIZABLE.test(src) ? src.replace(/\.png$/i, '.webp') : src;
}

/** onError helper: if the .webp failed, retry the original .png once. Returns true when it retried. */
export function retryOriginal(img: HTMLImageElement, original: string | undefined | null): boolean {
  if (original && img.src.endsWith('.webp') && optimizedImage(original) !== original) {
    img.src = original;
    return true;
  }
  return false;
}
