import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Events that mean the member currently HAS premium access.
const PREMIUM_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "PRODUCT_CHANGE",
]);

// Events that mean premium access has actually ENDED (not just "will not renew").
const DOWNGRADE_EVENTS = new Set(["EXPIRATION"]);

// Events we intentionally ignore for plan_id purposes:
// - CANCELLATION: auto-renew turned off, but access continues until period end (EXPIRATION follows later).
// - BILLING_ISSUE: temporary grace period, RevenueCat will send EXPIRATION if it's never resolved.
// - TRANSFER: ownership change between app_user_ids; too ambiguous to safely auto-apply here.

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (webhookSecret) {
    const authHeader = req.headers.get("Authorization") || "";
    const expected = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (expected !== webhookSecret) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase env is not configured" }, 500);
  }

  let payload: { event?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const event = payload.event || {};
  const type = String(event.type || "");
  // The app identifies purchasers by their Supabase member id (see identifyPurchaser()
  // in lib/revenueCat.ts), so app_user_id on the webhook is the members.id directly.
  const memberId = String(event.app_user_id || "");

  if (!memberId) {
    return json({ ok: true, skipped: "missing app_user_id" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: member } = await adminClient
    .from("members")
    .select("id")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) {
    return json({ ok: true, skipped: "no matching member" });
  }

  let nextPlanId: "free" | "premium" | null = null;
  if (PREMIUM_EVENTS.has(type)) nextPlanId = "premium";
  else if (DOWNGRADE_EVENTS.has(type)) nextPlanId = "free";

  if (!nextPlanId) {
    return json({ ok: true, ignored: type });
  }

  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const { error: memberError } = await adminClient
    .from("members")
    .update({ plan_id: nextPlanId, updated_at: nowIso })
    .eq("id", memberId);
  if (memberError) return json({ error: memberError.message }, 500);

  const { error: subError } = await adminClient.from("subscriptions").upsert(
    {
      id: `sub-${memberId}`,
      user_id: memberId,
      plan_id: nextPlanId,
      status: nextPlanId === "premium" ? "active" : "cancelled",
      started_at: today,
      updated_at: nowIso,
    },
    { onConflict: "id" }
  );
  if (subError) return json({ error: subError.message }, 500);

  return json({ ok: true, memberId, planId: nextPlanId, event: type });
});
