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

type MuxAsset = {
  id?: string;
  status?: string;
  passthrough?: string;
  playback_ids?: Array<{ id: string; policy?: string }>;
};

async function muxGet(path: string, tokenId: string, tokenSecret: string) {
  const basic = btoa(`${tokenId}:${tokenSecret}`);
  const res = await fetch(`https://api.mux.com${path}`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.messages?.[0] || body?.error?.message || `Mux API error (${res.status})`);
  }
  return body.data as Record<string, unknown>;
}

async function resolveAssetId(
  lesson: { mux_upload_id?: string | null; mux_asset_id?: string | null },
  tokenId: string,
  tokenSecret: string,
) {
  if (lesson.mux_asset_id) return lesson.mux_asset_id as string;
  if (!lesson.mux_upload_id) return null;

  const upload = await muxGet(`/video/v1/uploads/${lesson.mux_upload_id}`, tokenId, tokenSecret);
  return (upload.asset_id as string) || null;
}

async function syncLessonRecord(
  adminClient: ReturnType<typeof createClient>,
  lesson: { id: string; mux_upload_id?: string | null; mux_asset_id?: string | null },
  tokenId: string,
  tokenSecret: string,
) {
  const assetId = await resolveAssetId(lesson, tokenId, tokenSecret);
  if (!assetId) {
    return { lessonId: lesson.id, updated: false, status: "processing" };
  }

  const asset = (await muxGet(`/video/v1/assets/${assetId}`, tokenId, tokenSecret)) as MuxAsset;
  const playbackId = asset.playback_ids?.[0]?.id || "";

  if (asset.status === "ready" && playbackId) {
    const { error } = await adminClient
      .from("lessons")
      .update({
        mux_asset_id: assetId,
        mux_playback_id: playbackId,
        video_url: `https://stream.mux.com/${playbackId}.m3u8`,
        thumbnail_url: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
        video_status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lesson.id);

    if (error) throw error;
    return { lessonId: lesson.id, updated: true, status: "ready", playbackId };
  }

  if (asset.status === "errored") {
    await adminClient
      .from("lessons")
      .update({
        mux_asset_id: assetId,
        video_status: "errored",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lesson.id);
    return { lessonId: lesson.id, updated: true, status: "errored" };
  }

  if (assetId && asset.status === "preparing") {
    await adminClient
      .from("lessons")
      .update({
        mux_asset_id: assetId,
        video_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lesson.id);
  }

  return { lessonId: lesson.id, updated: false, status: asset.status || "processing", assetId };
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
  const { data: adminRow } = await adminClient
    .from("admin_users")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminRow?.is_active) {
    return json({ error: "Admin access required" }, 403);
  }

  const muxCreds = await resolveMuxCredentials(adminClient);
  if (!muxCreds) {
    return json({ error: "Mux credentials are not configured on the server" }, 500);
  }

  let lessonId = "";
  try {
    const body = await req.json().catch(() => ({}));
    lessonId = String(body?.lessonId || "").trim();
  } catch {
    lessonId = "";
  }

  let query = adminClient
    .from("lessons")
    .select("id, mux_upload_id, mux_asset_id")
    .in("video_status", ["uploading", "processing"]);

  if (lessonId) {
    query = adminClient
      .from("lessons")
      .select("id, mux_upload_id, mux_asset_id")
      .eq("id", lessonId);
  }

  const { data: lessons, error: lessonsError } = await query;
  if (lessonsError) {
    return json({ error: lessonsError.message }, 500);
  }

  const results = [];
  for (const lesson of lessons || []) {
    if (!lesson.mux_upload_id && !lesson.mux_asset_id) {
      results.push({ lessonId: lesson.id, updated: false, status: "awaiting", skipped: true });
      continue;
    }
    try {
      results.push(await syncLessonRecord(adminClient, lesson, muxCreds.tokenId, muxCreds.tokenSecret));
    } catch (err) {
      results.push({ lessonId: lesson.id, updated: false, error: err instanceof Error ? err.message : "Sync failed" });
    }
  }

  return json({ ok: true, results });
});
