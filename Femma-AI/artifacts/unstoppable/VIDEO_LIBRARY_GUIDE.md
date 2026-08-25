# Safety & Fitness video library

The app now contains a complete upload-ready curriculum for:

- Safety: 2 courses, 6 modules, 21 lessons
- Fitness: 4 courses, 12 modules, 36 lessons

The source of truth is `data/videoLibrary.ts`. Every lesson has a stable `id`,
an `uploadKey`, and empty `videoUrl` / `thumbnailUrl` fields.

## Add a video after filming

1. Upload the final MP4 to your video host or object storage.
2. Copy its HTTPS playback URL.
3. Find the lesson in `data/videoLibrary.ts` and set `videoUrl` to that URL.
4. Optionally set `thumbnailUrl` to a public HTTPS poster image.
5. Rebuild the app. The lesson player automatically replaces the upload-ready
   placeholder with native video controls, fullscreen, and picture-in-picture.

Example lesson record after upload:

```ts
{
  id: 'self-defense-wrist-grab-escapes',
  title: 'Breaking Free from Wrist Grabs',
  durationMinutes: 8,
  description: 'Understand grip weak points and rehearse a direct escape path.',
  videoUrl: 'https://cdn.example.com/video-library/self-defense/wrist-grab-escapes.mp4',
  uploadKey: 'video-library/self-defense/wrist-grab-escapes.mp4',
  thumbnailUrl: 'https://cdn.example.com/thumbnails/wrist-grab-escapes.jpg',
}
```

## Production content-management upgrade

For uploads without rebuilding the app, keep the same lesson IDs and move only
the media fields to a private admin CMS/API. The API should return:

```json
{
  "lessonId": "self-defense-wrist-grab-escapes",
  "videoUrl": "https://signed-or-public-playback-url",
  "thumbnailUrl": "https://thumbnail-url",
  "published": true
}
```

Recommended production responsibilities:

- Authentication and an admin-only upload page
- Object storage or a managed streaming service
- Signed upload URLs so credentials never ship in the mobile app
- Video transcoding and adaptive streaming for unreliable networks
- A database row keyed by the existing lesson ID
- Publish/unpublish status and thumbnail management

The learner-facing app already handles navigation, empty video slots, playback,
saved courses, continue-learning state, lesson completion, and progress storage.

