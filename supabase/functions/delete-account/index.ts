import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// POST /functions/v1/delete-account  (Authorization: Bearer <user access token>, body: {})
// Deletes the caller's members rows (cascades to member_progress, member_plans,
// member_diet_plans, subscriptions) and then the auth user itself.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if (!auth.user) return json({ error: auth.error || "Unauthorized" }, 401);
  const user = auth.user;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase env is not configured" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Never let this endpoint delete an admin account.
  const { data: adminRow } = await admin.from("admin_users").select("id").eq("id", user.id).maybeSingle();
  if (adminRow) return json({ error: "Admin accounts cannot be deleted from the app" }, 403);

  const { error: byIdError } = await admin.from("members").delete().eq("id", user.id);
  if (byIdError) return json({ error: byIdError.message }, 500);

  if (user.email) {
    const escaped = user.email.replace(/[\%_]/g, (c) => "\\" + c);
    const { error: byEmailError } = await admin.from("members").delete().ilike("email", escaped);
    if (byEmailError) return json({ error: byEmailError.message }, 500);
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteUserError) return json({ error: deleteUserError.message }, 500);

  return json({ ok: true });
});
