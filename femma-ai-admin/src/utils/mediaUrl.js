/** Detect video URLs from admin exercise media uploads (GIF/image stay separate). */
export function isVideoMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (/^data:video\//i.test(url)) return true;
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|avi)$/i.test(clean);
}
