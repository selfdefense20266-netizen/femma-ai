import { LOCAL_GIFS } from '@/data/exerciseGifAssets';
import type { DailyPlanItem } from '@/lib/dailyPlans';

/** True when media_url points at a video (admin upload), not a GIF/image. */
export function isVideoMediaUrl(url?: string | number | null): boolean {
  if (!url || typeof url !== 'string') return false;
  if (/^data:video\//i.test(url)) return true;
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|avi)$/i.test(clean);
}

/** Local fallbacks when admin media_url is empty. */
export function defaultMediaForDailyItem(item: DailyPlanItem): string | number {
  if (item.mediaUrl) return item.mediaUrl;

  const title = item.title.toLowerCase();

  if (item.itemType === 'food') {
    if (/smoothie|bowl|breakfast/i.test(title)) return require('@/assets/recipes/r1.webp');
    if (/lentil|dinner|warm/i.test(title)) return require('@/assets/recipes/r5.webp');
    return require('@/assets/recipes/r3.webp');
  }

  if (item.itemType === 'rest' || /breath|meditat/i.test(title)) return LOCAL_GIFS.breath;
  if (item.itemType === 'recovery' || /legs up|savasana|restore/i.test(title)) return LOCAL_GIFS.yoga;
  if (/squat/i.test(title)) return LOCAL_GIFS.squat;
  if (/push.?up|plank/i.test(title)) return LOCAL_GIFS.pushup;
  if (/jog|run|cardio/i.test(title)) return LOCAL_GIFS.jog;
  if (/bike|cycle/i.test(title)) return LOCAL_GIFS.bike;
  if (/treadmill/i.test(title)) return LOCAL_GIFS.treadmill;
  if (/jump.?rope|rope/i.test(title)) return LOCAL_GIFS.rope;
  if (/jack|march|knee/i.test(title)) return LOCAL_GIFS.march;
  if (/yoga|salutation|hip|stretch|flow|pilates/i.test(title)) return LOCAL_GIFS.yoga;

  return LOCAL_GIFS.yoga;
}
