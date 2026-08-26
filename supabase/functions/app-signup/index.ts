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

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const normalized = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function saveMember(
  admin: ReturnType<typeof createClient>,
  input: { id: string; email: string; firstName: string; lastName: string }
) {
  const name = `${input.firstName} ${input.lastName}`.trim() || input.email.split("@")[0];
  const full = {
    id: input.id,
    email: input.email,
    name,
    first_name: input.firstName,
    last_name: input.lastName,
    status: "active",
  };

  const { error } = await admin.from("members").upsert(full, { onConflict: "email" });
  if (!error) return;

  const missingColumn = /first_name|last_name|schema cache|column/i.test(error.message || "");
  if (!missingColumn) throw error;

  const { error: retryError } = await admin.from("members").upsert(
    { id: input.id, email: input.email, name, status: "active" },
    { onConflict: "email" }
  );
  if (retryError) throw retryError;
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

  const action = body.action === "confirm" ? "confirm" : "signup";
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();

  if (!email) return json({ error: "Email is required" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (action === "signup") {
      if (!password) return json({ error: "Password is required" }, 400);
      if (!firstName) return json({ error: "First name is required" }, 400);
      if (!lastName) return json({ error: "Last name is required" }, 400);

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
        if (!/already/i.test(error.message || "")) {
          return json({ error: error.message || "Unable to create account" }, 400);
        }

        const existing = await findUserByEmail(admin, email);
        if (!existing) return json({ error: "An account with this email already exists" }, 409);
        if (!existing.email_confirmed_at) {
          await admin.auth.admin.updateUserById(existing.id, { email_confirm: true });
        }
        await saveMember(admin, { id: existing.id, email, firstName, lastName });
        return json({ ok: true, existing: true, userId: existing.id });
      }

      const userId = data.user?.id;
      if (!userId) return json({ error: "Unable to create account" }, 500);
      await saveMember(admin, { id: userId, email, firstName, lastName });
      return json({ ok: true, userId });
    }

    const existing = await findUserByEmail(admin, email);
    if (!existing) return json({ error: "No account found for this email" }, 404);
    if (!existing.email_confirmed_at) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, { email_confirm: true });
      if (error) return json({ error: error.message }, 400);
    }
    const meta = existing.user_metadata || {};
    await saveMember(admin, {
      id: existing.id,
      email,
      firstName: firstName || String(meta.first_name || ""),
      lastName: lastName || String(meta.last_name || ""),
    });
    return json({ ok: true, confirmed: true, userId: existing.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save account";
    return json({ error: message }, 500);
  }
});
