import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AdminNoticeRow = {
  id: string;
  title: string;
  body: string;
  audience: string;
  sentAt: string;
};

export function noticeMatchesMember(audience: string, email: string, isPremium: boolean) {
  const target = (audience || 'all').trim();
  const userEmail = email.trim().toLowerCase();
  if (!target || target === 'all') return true;
  if (target === 'premium') return Boolean(isPremium);
  if (target.startsWith('email:')) {
    if (!userEmail) return false;
    return target.slice(6).trim().toLowerCase() === userEmail;
  }
  if (target.startsWith('user:')) {
    const id = target.slice(5).trim().toLowerCase();
    if (!id || !userEmail) return false;
    return id === userEmail;
  }
  // Untargeted category blasts are shown to everyone for now
  if (target.startsWith('category:')) return true;
  return false;
}

export async function fetchSentAdminNotices(): Promise<AdminNoticeRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, audience, status, sent_at, created_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(80);
  if (error || !data) return [];
  return data
    .filter((row) => row?.id && row?.title)
    .map((row) => ({
      id: String(row.id),
      title: String(row.title),
      body: String(row.body || ''),
      audience: String(row.audience || 'all'),
      sentAt: String(row.sent_at || row.created_at || new Date().toISOString()),
    }));
}
