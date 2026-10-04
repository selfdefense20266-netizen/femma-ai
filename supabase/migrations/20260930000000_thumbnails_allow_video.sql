-- Allow short exercise demo videos (mp4/webm/mov) alongside GIF/images in thumbnails bucket
update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ]::text[]
where id = 'thumbnails';
