import { supabase } from 'lib/supabase';

export function mapNotification(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience || 'all',
    status: row.status || 'draft',
    createdAt: row.created_at,
    sentAt: row.sent_at || null
  };
}

export async function fetchNotifications() {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapNotification);
}

export async function upsertNotification(payload) {
  const row = {
    id: payload.id,
    title: String(payload.title || '').trim(),
    body: String(payload.body || '').trim(),
    audience: payload.audience || 'all',
    status: payload.status || 'draft',
    sent_at: payload.sentAt || null
  };
  if (!row.id) delete row.id;
  if (!row.title || !row.body) throw new Error('Title and body are required');

  const { data, error } = await supabase.from('notifications').upsert(row).select('*').single();
  if (error) throw error;
  return mapNotification(data);
}

export async function markNotificationSent(id) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapNotification(data);
}
