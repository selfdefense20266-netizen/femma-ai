import { supabase } from '@/lib/supabase';
import { libraryPath } from '@/lib/catalog';

export type ProgramCard = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  courseId: string;
  categoryId: string;
  courseTitle: string;
  route: string;
};

function mapRow(row: any): ProgramCard | null {
  const courseId = String(row.course_id || row.courses?.id || '').trim();
  const categoryId = String(row.courses?.category_id || '').trim();
  if (!courseId || !categoryId) return null;
  return {
    id: row.id,
    title: String(row.title || '').trim() || 'Program',
    subtitle: String(row.subtitle || '').trim(),
    imageUrl: row.image_url || row.courses?.image_url || null,
    courseId,
    categoryId,
    courseTitle: String(row.courses?.title || '').trim(),
    route: libraryPath(categoryId, courseId),
  };
}

export async function fetchPublishedProgramCards(): Promise<ProgramCard[]> {
  const { data, error } = await supabase
    .from('program_cards')
    .select('*, courses(id, title, category_id, image_url, status)')
    .eq('status', 'published')
    .order('sort_order');
  if (error) throw error;

  return (data || []).map(mapRow).filter((card): card is ProgramCard => Boolean(card));
}
