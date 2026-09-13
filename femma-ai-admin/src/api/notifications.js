import { supabase } from 'lib/supabase';

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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

export function audienceLabel(audience, users = []) {
  const value = audience || 'all';
  if (value === 'all') return 'All members';
  if (value === 'premium') return 'Premium only';
  if (value.startsWith('email:')) {
    const email = value.slice(6);
    const member = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    return member ? `${member.name} (${email})` : email;
  }
  if (value.startsWith('user:')) {
    const id = value.slice(5);
    const member = users.find((u) => u.id === id || (u.email || '').toLowerCase() === id.toLowerCase());
    return member ? `${member.name} (${member.email})` : id;
  }
  if (value.startsWith('category:')) return `Category ${value.slice(9)}`;
  return value;
}

export async function fetchNotifications() {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapNotification);
}

export async function upsertNotification(payload) {
  const title = String(payload.title || '').trim();
  const body = String(payload.body || '').trim();
  const audience = payload.audience || 'all';
  const status = payload.status || 'draft';
  if (!title || !body) throw new Error('Title and body are required');

  if (payload.id) {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        title,
        body,
        audience,
        status,
        sent_at: payload.sentAt || null
      })
      .eq('id', payload.id)
      .select('*')
      .single();
    if (error) throw error;
    return mapNotification(data);
  }

  const row = {
    id: newId(),
    title,
    body,
    audience,
    status,
    sent_at: payload.sentAt || null
  };

  const { data, error } = await supabase.from('notifications').insert(row).select('*').single();
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

/** Create + mark sent in one call for reliability */
export async function createAndSendNotification(payload) {
  const saved = await upsertNotification({
    ...payload,
    status: 'sent',
    sentAt: new Date().toISOString()
  });
  return saved;
}
