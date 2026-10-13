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
  plan_id?: string | null;
  status?: string | null;
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

/**
 * Reads the signed-in member's own row. RLS only returns the caller's row
 * (id = auth.uid() or email = JWT email), so this requires a Supabase session.
 */
export async function fetchMemberByEmail(email: string) {
  if (!email) return null;
  const byEmail = await supabase.from('members').select('*').eq('email', email.toLowerCase()).maybeSingle();
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

/** Write name fields only — plan_id / status are server-owned (RevenueCat webhook / admin). */
async function writeMemberProfile(
  existing: MemberRow | null,
  input: { id: string; email: string; firstName: string; lastName: string }
) {
  const name = `${input.firstName} ${input.lastName}`.trim();
  const variants: Record<string, unknown>[] = [
    { name, first_name: input.firstName, last_name: input.lastName },
    { name },
  ];

  let lastError: { message?: string } | null = null;
  for (const fields of variants) {
    const { error } = existing
      ? await supabase.from('members').update(fields).eq('id', existing.id)
      : await supabase.from('members').insert({ id: input.id, email: input.email, ...fields });
    if (!error) return;
    lastError = error;
    const missingColumn = /first_name|last_name|schema cache|column/i.test(error.message || '');
    if (!missingColumn) throw error;
  }

  if (lastError) throw lastError;
}

/**
 * Load (and create/refresh if needed) the members row for a signed-in Supabase user.
 * Must only be called with an active session — RLS hides members from anon.
 */
export async function persistAndLoadProfile(
  authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  firstName = '',
  lastName = '',
  forceWrite = false
): Promise<AuthUser> {
  const meta = authUser.user_metadata || {};
  const metaFull = splitName(
    String(meta.full_name || meta.name || meta.fullName || '').trim() || null
  );
  const fallback = {
    firstName:
      firstName ||
      String(meta.first_name || meta.firstName || meta.given_name || '').trim() ||
      metaFull.firstName,
    lastName:
      lastName ||
      String(meta.last_name || meta.lastName || meta.family_name || '').trim() ||
      metaFull.lastName,
    email: (authUser.email || '').toLowerCase(),
  };
  // Last resort: email local-part so UI never shows a blank name.
  if (!fallback.firstName && fallback.email) {
    fallback.firstName = fallback.email.split('@')[0] || '';
  }

  let existing: MemberRow | null = null;
  try {
    existing = await fetchMemberByUser(authUser.id, fallback.email);
  } catch {
    existing = null;
  }
  const profile = memberToAuthUser(existing, fallback);

  const explicitName = Boolean(firstName || lastName);
  const needsWrite =
    !existing ||
    (forceWrite &&
      explicitName &&
      (profile.firstName !== (existing.first_name || '') || profile.lastName !== (existing.last_name || '')));

  if (needsWrite) {
    try {
      await writeMemberProfile(existing, {
        id: authUser.id,
        email: profile.email,
        firstName: explicitName ? firstName || profile.firstName : profile.firstName,
        lastName: explicitName ? lastName || profile.lastName : profile.lastName,
      });
      const member = await fetchMemberByUser(authUser.id, profile.email);
      return memberToAuthUser(member, profile);
    } catch (error) {
      console.warn('Could not save member profile', error);
    }
  }

  return profile;
}
