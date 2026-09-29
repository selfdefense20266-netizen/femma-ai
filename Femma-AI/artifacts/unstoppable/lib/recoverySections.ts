import { supabase } from '@/lib/supabase';
import type { DailyPlanIntensity } from '@/lib/dailyPlans';

export type RecoverySectionItem = {
  id: string;
  sectionId: string;
  intensityLevel: DailyPlanIntensity;
  title: string;
  durationMinutes: number;
  restMinutes: number;
  mediaUrl: string | null;
  cue: string;
  steps: string[];
  sortOrder: number;
};

export type RecoverySection = {
  id: string;
  title: string;
  sectionKey: string;
  isRest: boolean;
  coverUrl: string;
  status: string;
  sortOrder: number;
  items: RecoverySectionItem[];
};

function mapItem(row: any): RecoverySectionItem {
  const raw = String(row.intensity_level || 'beginner').toLowerCase();
  const intensityLevel: DailyPlanIntensity =
    raw === 'active' ? 'active' : raw === 'intermediate' ? 'intermediate' : 'beginner';
  return {
    id: row.id,
    sectionId: row.section_id,
    intensityLevel,
    title: row.title,
    durationMinutes: Number(row.duration_minutes ?? 10),
    restMinutes: Number(row.rest_minutes ?? 0),
    mediaUrl: row.media_url || null,
    cue: row.cue || '',
    steps: Array.isArray(row.steps) ? row.steps : [],
    sortOrder: row.sort_order ?? 0,
  };
}

function mapSection(row: any, items: any[]): RecoverySection {
  return {
    id: row.id,
    title: row.title,
    sectionKey: row.section_key || 'custom',
    isRest: Boolean(row.is_rest),
    coverUrl: row.cover_url || '',
    status: row.status || 'draft',
    sortOrder: row.sort_order ?? 0,
    items: items
      .filter((item) => item.section_id === row.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(mapItem),
  };
}

export async function fetchPublishedRecoverySections(): Promise<RecoverySection[]> {
  const [secRes, itemRes] = await Promise.all([
    supabase.from('recovery_sections').select('*').eq('status', 'published').order('sort_order').limit(50),
    supabase.from('recovery_section_items').select('*').order('sort_order').limit(2000),
  ]);

  if (secRes.error) {
    if (/relation|does not exist|schema cache/i.test(secRes.error.message || '')) return [];
    throw secRes.error;
  }
  if (itemRes.error) {
    if (/relation|does not exist|schema cache/i.test(itemRes.error.message || '')) {
      return (secRes.data || []).map((row) => mapSection(row, []));
    }
    throw itemRes.error;
  }

  return (secRes.data || []).map((row) => mapSection(row, itemRes.data || []));
}

export function sectionExercisesForLevel(
  section: RecoverySection | null | undefined,
  intensity: DailyPlanIntensity
): RecoverySectionItem[] {
  if (!section?.items?.length) return [];
  const matched = section.items.filter((item) => item.intensityLevel === intensity);
  return matched.length ? matched : section.items.filter((item) => item.intensityLevel === 'beginner');
}
