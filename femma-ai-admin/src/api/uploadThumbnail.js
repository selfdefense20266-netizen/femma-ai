import { supabase } from 'lib/supabase';

const BUCKET = 'thumbnails';

const MB = 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * MB;
export const MAX_ANIMATED_BYTES = 50 * MB; // GIF / video

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif', 'svg']);
const ANIMATED_EXTS = new Set(['gif', 'mp4', 'webm', 'mov', 'm4v']);

function fileKind(file, ext) {
  const type = String(file?.type || '').toLowerCase();
  if (type === 'image/gif' || type.startsWith('video/') || ANIMATED_EXTS.has(ext)) return 'animated';
  if (type.startsWith('image/') || IMAGE_EXTS.has(ext)) return 'image';
  return null;
}

/** Throws a user-facing error if the file is not an allowed type/size. */
export function validateMediaFile(file) {
  if (!file) throw new Error('No file selected');
  const ext = (file.name?.split('.').pop() || '').toLowerCase();
  const kind = fileKind(file, ext);
  if (!kind) throw new Error('Unsupported file type. Use an image (JPG, PNG, WebP), a GIF or a video (MP4, WebM, MOV).');
  const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_ANIMATED_BYTES;
  if (file.size > limit) {
    throw new Error(
      `File is too large (${(file.size / MB).toFixed(1)} MB). Max ${limit / MB} MB for ${kind === 'image' ? 'images' : 'GIFs and videos'}.`
    );
  }
  return kind;
}

/**
 * Upload an image / GIF / short video to the shared public `thumbnails` bucket
 * and return its public URL. Throws on validation or storage errors.
 */
export async function uploadThumbnail(pathPrefix, file) {
  validateMediaFile(file);

  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const safePrefix = String(pathPrefix || 'uploads')
    .replace(/[^a-z0-9/_-]/gi, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
  const fileName = `${safePrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
    upsert: false,
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
  });
  if (error) throw new Error(`Upload failed: ${error.message || 'storage error'}`);
  if (!data) throw new Error('Upload failed');

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  if (!urlData?.publicUrl) throw new Error('Upload failed: could not get a public URL');
  return urlData.publicUrl;
}
