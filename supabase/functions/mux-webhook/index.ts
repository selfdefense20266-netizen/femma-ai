import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const type = event.type || "";
  const data = event.data || {};
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

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
