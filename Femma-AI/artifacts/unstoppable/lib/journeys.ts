import { supabase } from '@/lib/supabase';

export type Journey = {
  id: string;
  title: string;
  eyebrow: string;
  detail: string;
  imageUrl: string | null;
  colors: [string, string];
  courseIds: string[];
};

function mapJourney(row: any, linkRows: any[]): Journey {
  const courseIds = linkRows
    .filter((link) => link.journey_id === row.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((link) => link.course_id);

  return {
    id: row.id,
    title: row.title,
    eyebrow: row.eyebrow || '',
    detail: row.detail || '',
    imageUrl: row.image_url || null,
    colors: [row.color_start || '#1B6B67', row.color_end || '#012E2D'],
    courseIds,
  };
}

export async function fetchJourneys(): Promise<Journey[]> {
  const [journeysRes, linksRes] = await Promise.all([
    supabase.from('journeys').select('*').eq('status', 'published').order('sort_order'),
    supabase.from('journey_courses').select('*').order('sort_order'),
  ]);

  const firstError = journeysRes.error || linksRes.error;
  if (firstError) throw firstError;

  const linkRows = linksRes.data || [];
  return (journeysRes.data || []).map((row) => mapJourney(row, linkRows));
}
