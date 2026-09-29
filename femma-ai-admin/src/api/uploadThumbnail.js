import { supabase } from 'lib/supabase';

const BUCKET = 'thumbnails';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image to the shared public `thumbnails` bucket.
 * Falls back to a data URL if storage is unavailable so admin can still save.
 */
export async function uploadThumbnail(pathPrefix, file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const safePrefix = String(pathPrefix || 'uploads')
    .replace(/[^a-z0-9/_-]/gi, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
  const fileName = `${safePrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
      upsert: true,
      contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
    });
    if (error) throw error;
    if (!data) throw new Error('Upload failed');
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    if (urlData?.publicUrl) return urlData.publicUrl;
  } catch (err) {
    console.warn(`[uploadThumbnail] ${BUCKET}/${fileName}:`, err?.message || err);
  }

  return fileToDataUrl(file);
}
