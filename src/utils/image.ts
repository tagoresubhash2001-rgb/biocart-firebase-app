/**
 * Fast image URLs.
 * - Built-in product photos (/assets/products/x.png) are served as small WebP files (x.webp).
 * - Unsplash photos are requested at a sensible width instead of 1200–1920px.
 * Everything else (Firebase Storage uploads etc.) is returned unchanged.
 */
export function imgSrc(url: string | undefined | null, width = 800): string {
  const u = String(url || '').trim();
  if (!u) return '';
  const local = u.match(/^(\/assets\/products\/[\w-]+)\.png$/i);
  if (local) return `${local[1]}.webp`;
  if (u.startsWith('https://images.unsplash.com/')) {
    return u.replace(/([?&])w=\d+/, `$1w=${width}`).replace(/([?&])q=\d*/, '$1q=70');
  }
  return u;
}

/** Small neutral placeholder shown when a photo cannot be loaded at all. */
export const IMAGE_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#eef2ee"/><path d="M50 28c-9 10-14 19-14 27a14 14 0 0 0 28 0c0-8-5-17-14-27z" fill="#9bb8a4"/></svg>'
  );

/** onError handler for plain <img>: WebP → original PNG → placeholder. */
export function onImgError(e: { currentTarget: HTMLImageElement }) {
  const el = e.currentTarget;
  const cur = el.getAttribute('src') || '';
  if (/^\/assets\/products\/[\w-]+\.webp$/i.test(cur)) { el.src = cur.replace(/\.webp$/i, '.png'); return; }
  if (cur !== IMAGE_FALLBACK) el.src = IMAGE_FALLBACK;
}
