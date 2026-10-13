import { createClient } from "jsr:@supabase/supabase-js@2";

export type AuthedUser = { id: string; email: string | null };

/**
 * Resolves the calling Supabase Auth user from the request's Authorization bearer token.
 * Returns { user: null } when there is no valid logged-in user (anon key alone is rejected).
 */
export async function requireUser(
  req: Request,
): Promise<{ user: AuthedUser | null; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return { user: null, error: "Supabase env is not configured" };

  const authHeader = req.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authHeader)) return { user: null, error: "Missing authorization" };

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  const user = data?.user;
  if (error || !user?.id) return { user: null, error: "Unauthorized" };
  return { user: { id: String(user.id), email: user.email ? String(user.email).toLowerCase() : null } };
}
