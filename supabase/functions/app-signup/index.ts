import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

async function saveMember(
  admin: ReturnType<typeof createClient>,
  input: { id: string; email: string; firstName: string; lastName: string }
) {
  const name = `${input.firstName} ${input.lastName}`.trim() || input.email.split("@")[0];
  const profile = { name, first_name: input.firstName, last_name: input.lastName };

  // Legacy members rows (id like 'member-<ts>', no auth user) may already exist for this email.
  // Update their profile fields but never change the id: member_progress etc. reference it.
  const { data: existingRow, error: lookupError } = await admin
    .from("members")
    .select("id")
    .ilike("email", input.email.replace(/[\\%_]/g, (c) => "\\" + c))
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existingRow?.id) {
    const { error } = await admin
      .from("members")
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq("id", existingRow.id);
    if (error) throw error;
    return String(existingRow.id);
  }

  const { error } = await admin
    .from("members")
    .upsert({ id: input.id, email: input.email, ...profile, status: "active" }, { onConflict: "id" });
  if (error) throw error;
  return input.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase env is not configured" }, 500);
  }

  let body: {
    action?: string;
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.action && body.action !== "signup") {
    return json({ error: "Unsupported action" }, 400);
  }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();

  if (!email) return json({ error: "Email is required" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!password) return json({ error: "Password is required" }, 400);
  if (!firstName) return json({ error: "First name is required" }, 400);
  if (!lastName) return json({ error: "Last name is required" }, 400);

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      },
    });

    if (error) {
      const message = error.message || "";
      const code = String((error as { code?: string }).code || "");
      if (code === "email_exists" || code === "user_already_exists" || /already|registered/i.test(message)) {
        // Never touch existing data and never confirm/merge without the password.
        return json({ error: "An account with this email already exists. Try logging in." }, 409);
      }
      return json({ error: message || "Unable to create account" }, 400);
    }

    const userId = data.user?.id;
    if (!userId) return json({ error: "Unable to create account" }, 500);
    const memberId = await saveMember(admin, { id: userId, email, firstName, lastName });
    return json({ ok: true, userId, memberId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save account";
    return json({ error: message }, 500);
  }
});
