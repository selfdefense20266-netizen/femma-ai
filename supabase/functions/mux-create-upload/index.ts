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

async function resolveMuxCredentials(adminClient: ReturnType<typeof createClient>) {
  let tokenId = Deno.env.get("MUX_TOKEN_ID") || "";
  let tokenSecret = Deno.env.get("MUX_TOKEN_SECRET") || "";

  if (tokenId && tokenSecret) {
    return { tokenId, tokenSecret };
  }

  const { data, error } = await adminClient
    .from("mux_credentials")
    .select("token_id, token_secret")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data?.token_id || !data?.token_secret) {
    return null;
  }

  return { tokenId: data.token_id as string, tokenSecret: data.token_secret as string };
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: "Supabase env is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: adminRow, error: adminError } = await adminClient
    .from("admin_users")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !adminRow?.is_active) {
    return json({ error: "Admin access required" }, 403);
  }

  const muxCreds = await resolveMuxCredentials(adminClient);
  if (!muxCreds) {
    return json({ error: "Mux credentials are not configured on the server" }, 500);
  }

  let lessonId = "";
  try {
    const body = await req.json();
    lessonId = String(body?.lessonId || "").trim();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!lessonId) {
    return json({ error: "lessonId is required" }, 400);
  }

  const { data: lesson, error: lessonError } = await adminClient
    .from("lessons")
    .select("id, title")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError || !lesson) {
    return json({ error: "Lesson not found" }, 404);
  }

  const basic = btoa(`${muxCreds.tokenId}:${muxCreds.tokenSecret}`);
  const muxRes = await fetch("https://api.mux.com/video/v1/uploads", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        passthrough: lessonId,
      },
    }),
  });

  const muxJson = await muxRes.json();
  if (!muxRes.ok) {
    return json({ error: muxJson?.error?.message || "Failed to create Mux upload" }, 502);
  }

  const upload = muxJson.data;
  const uploadId = upload.id as string;
  const uploadUrl = upload.url as string;

  const { error: updateError } = await adminClient
    .from("lessons")
    .update({
      mux_upload_id: uploadId,
      video_status: "uploading",
      updated_at: new Date().toISOString(),
    })
    .eq("id", lessonId);

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  return json({
    uploadId,
    uploadUrl,
    lessonId,
  });
});
