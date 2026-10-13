import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SIGNATURE_TOLERANCE_SECONDS = 300;

async function resolveWebhookSecret(adminClient: ReturnType<typeof createClient>) {
  const fromEnv = Deno.env.get("MUX_WEBHOOK_SECRET");
  if (fromEnv) return fromEnv;
  const { data } = await adminClient
    .from("app_secrets")
    .select("value")
    .eq("id", "mux_webhook_secret")
    .maybeSingle();
  return (data?.value as string | undefined) || null;
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verifies Mux's `mux-signature: t=<unix ts>,v1=<hex hmac>` header over `${t}.${rawBody}`. */
async function verifyMuxSignature(header: string | null, rawBody: string, secret: string) {
  if (!header) return false;
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "t") timestamp = v;
    else if (k === "v1") signatures.push(v.toLowerCase());
  }
  const ts = Number(timestamp);
  if (!timestamp || !Number.isFinite(ts) || signatures.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  return signatures.some((sig) => timingSafeEqualHex(sig, expected));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase env is not configured" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const webhookSecret = await resolveWebhookSecret(adminClient);
  if (!webhookSecret) {
    console.error("MUX_WEBHOOK_SECRET is not set; refusing webhook");
    return json({ error: "Webhook secret is not configured" }, 500);
  }

  // Signature is computed over the exact raw body, so read text before parsing.
  const rawBody = await req.text();
  const valid = await verifyMuxSignature(req.headers.get("mux-signature"), rawBody, webhookSecret);
  if (!valid) {
    return json({ error: "Invalid signature" }, 401);
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const type = event.type || "";
  const data = event.data || {};

  if (type === "video.asset.ready") {
    const assetId = String(data.id || "");
    const passthrough = String(data.passthrough || "");
    const playbackIds = (data.playback_ids as Array<{ id: string; policy: string }>) || [];
    const playbackId = playbackIds[0]?.id || "";
    const durationSeconds = Number(data.duration);
    const durationMinutes =
      Number.isFinite(durationSeconds) && durationSeconds > 0
        ? Math.max(1, Math.min(240, Math.round(durationSeconds / 60)))
        : null;

    if (!assetId || !playbackId) {
      return json({ ok: true, skipped: "missing asset or playback id" });
    }

    const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;

    let query = adminClient.from("lessons").update({
      mux_asset_id: assetId,
      mux_playback_id: playbackId,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      video_status: "ready",
      ...(durationMinutes != null ? { duration_minutes: durationMinutes } : {}),
      updated_at: new Date().toISOString(),
    });

    if (passthrough) {
      query = query.eq("id", passthrough);
    } else {
      query = query.eq("mux_asset_id", assetId);
    }

    const { error } = await query;
    if (error) return json({ error: error.message }, 500);
    return json({
      ok: true,
      lessonId: passthrough || null,
      status: "ready",
      durationMinutes,
    });
  }

  if (type === "video.asset.errored") {
    const passthrough = String(data.passthrough || "");
    const assetId = String(data.id || "");
    let query = adminClient.from("lessons").update({
      video_status: "errored",
      mux_asset_id: assetId || null,
      updated_at: new Date().toISOString(),
    });
    if (passthrough) query = query.eq("id", passthrough);
    else if (assetId) query = query.eq("mux_asset_id", assetId);
    else return json({ ok: true, skipped: true });

    const { error } = await query;
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, status: "errored" });
  }

  if (type === "video.upload.asset_created") {
    const uploadId = String(data.id || "");
    const assetId = String(data.asset_id || "");
    if (!uploadId) return json({ ok: true, skipped: true });

    const { error } = await adminClient
      .from("lessons")
      .update({
        mux_asset_id: assetId || null,
        video_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("mux_upload_id", uploadId);

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, status: "processing" });
  }

  return json({ ok: true, ignored: type });
});
