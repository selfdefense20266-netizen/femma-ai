import { supabase } from '@/lib/supabase';

type AuthUser = {
  firstName: string;
  lastName: string;
  email: string;
};

type MemberRow = {
  id: string;
  email: string;
  name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  password_hash?: string | null;
};

function splitName(name?: string | null) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

export function memberToAuthUser(
  member: Partial<MemberRow> | null | undefined,
  fallback: { email?: string | null; firstName?: string; lastName?: string }
): AuthUser {
  const fromMember = {
    firstName: member?.first_name?.trim() || '',
    lastName: member?.last_name?.trim() || '',
  };
  const fromName = splitName(member?.name);
  return {
    firstName: fromMember.firstName || fallback.firstName || fromName.firstName,
    lastName: fromMember.lastName || fallback.lastName || fromName.lastName,
    email: (member?.email || fallback.email || '').toLowerCase(),
  };
}

export async function fetchMemberByEmail(email: string) {
  const byEmail = await supabase.from('members').select('*').eq('email', email).maybeSingle();
  if (!byEmail.error && byEmail.data) return byEmail.data as MemberRow;
  return null;
}

export async function fetchMemberByUser(userId: string, email: string) {
  if (userId) {
    const byId = await supabase.from('members').select('*').eq('id', userId).maybeSingle();
    if (!byId.error && byId.data) return byId.data as MemberRow;
  }

  return fetchMemberByEmail(email);
}

function newMemberId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `member-${Date.now()}`;
}

export async function saveMemberProfile(input: {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
}) {
  const existing = await fetchMemberByEmail(input.email);
  const fromName = splitName(existing?.name);
  const firstName = input.firstName?.trim() || existing?.first_name?.trim() || fromName.firstName;
  const lastName = input.lastName?.trim() || existing?.last_name?.trim() || fromName.lastName;
  const id = input.id || existing?.id || newMemberId();

  await upsertMemberProfile({
    id,
    email: input.email,
    firstName: firstName || input.email.split('@')[0],
    lastName,
    passwordHash: input.passwordHash,
  });

  const member = await fetchMemberByEmail(input.email);
  return memberToAuthUser(member, { email: input.email, firstName, lastName });
}

export async function upsertMemberProfile(input: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash?: string;
}) {
  const name = `${input.firstName} ${input.lastName}`.trim();
  const rows: Record<string, unknown>[] = [
    {
      id: input.id,
      email: input.email,
      name,
      first_name: input.firstName,
      last_name: input.lastName,
      status: 'active',
      ...(input.passwordHash ? { password_hash: input.passwordHash } : {}),
    },
    {
      id: input.id,
      email: input.email,
      name,
      first_name: input.firstName,
      last_name: input.lastName,
      status: 'active',
    },
    { id: input.id, email: input.email, name, status: 'active' },
  ];

  let lastError: { message?: string } | null = null;
  for (const row of rows) {
    const { error } = await supabase.from('members').upsert(row, { onConflict: 'email' });
    if (!error) return;
    lastError = error;
    const missingColumn = /password_hash|first_name|last_name|schema cache|column/i.test(error.message || '');
    if (!missingColumn) throw error;
  }

  if (lastError) throw lastError;
}

export async function persistAndLoadProfile(
  authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  firstName = '',
  lastName = '',
  forceWrite = false
): Promise<AuthUser> {
  const meta = authUser.user_metadata || {};
  const fallback = {
    firstName: firstName || String(meta.first_name || '').trim(),
    lastName: lastName || String(meta.last_name || '').trim(),
    email: (authUser.email || '').toLowerCase(),
  };
  const existing = await fetchMemberByUser(authUser.id, fallback.email);
  const profile = memberToAuthUser(existing, fallback);

  if (forceWrite || !existing) {
    try {
      await upsertMemberProfile({
        id: authUser.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    } catch (error) {
      console.warn('Could not save member profile', error);
    }
  }

  const member = await fetchMemberByUser(authUser.id, profile.email);
  return memberToAuthUser(member, profile);
}
