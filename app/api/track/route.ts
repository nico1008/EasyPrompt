/* POST /api/track — body { kind, key, action, sid }.
 *
 * Records a usage event (copy / open-in / view) for the public catalog + curated
 * example prompts. Anonymous-first: anon has zero table grants, so the write goes
 * through the security-definer record_interaction() RPC (same pattern as ratings).
 *
 * Integrity (Phase 1, proportionate — these are cosmetic counters with no owner or
 * reputation yet): a coarse per-IP rate limit, a same-origin guard, a non-empty
 * User-Agent check, and a server-computed salted actor_hash = hash(sid + coarse IP)
 * so cookie/sid rotation alone can't trivially mint identities (the IP component
 * anchors it). Raw IP is never stored — only the salted ip_hash, for retro
 * de-spamming. Reputation-grade hardening lands with the community phases. */

import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { hmacSign } from "@/lib/access/code";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { trackInputSchema } from "@/lib/metrics/schema";

const NO_STORE = { "Cache-Control": "no-store", "Content-Type": "application/json" };

/** 204, no body — the client fires-and-forgets and never reads the response. */
function noContent(): Response {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE });
}

/** Coarsen the IP so the actor/ip hash is a /24 (IPv4) or /48 (IPv6) — enough to
 *  resist sid rotation without pinning a single device. */
function coarseIp(ip: string): string {
  if (ip === "unknown") return ip;
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":"); // IPv6 /48
  const parts = ip.split(".");
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : ip; // IPv4 /24
}

/** Reject only a *present but mismatched* Origin/Referer (blocks cross-site POSTs;
 *  a missing header — e.g. a privacy browser — is allowed, since it's never a
 *  cross-origin browser fetch and is still IP-rate-limited). */
function originOk(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return true;
  const ref = req.headers.get("origin") || req.headers.get("referer");
  if (!ref) return true;
  try {
    return new URL(ref).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  // Feature off, or no salt configured → accept-and-drop so dev/anon never breaks.
  if (!isSupabaseConfigured()) return noContent();
  const salt = process.env.METRICS_SALT;
  if (!salt) return noContent();

  if (!originOk(req)) return json({ ok: false, reason: "bad-origin" }, 403);
  if (!req.headers.get("user-agent")) return json({ ok: false, reason: "no-ua" }, 400);

  const ip = clientIp(req);
  const rl = checkRateLimit(`track:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ ok: false, reason: "rate-limited" }), {
      status: 429,
      headers: { ...NO_STORE, "Retry-After": String(rl.retryAfter) },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "malformed" }, 400);
  }
  const parsed = trackInputSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, reason: "invalid" }, 400);

  const cIp = coarseIp(ip);
  const actorHash = await hmacSign(salt, `m:${parsed.data.sid}|${cIp}`);
  const ipHash = await hmacSign(salt, `ip:${cIp}`);

  try {
    const supabase = await createClient();
    await supabase.rpc("record_interaction", {
      p_kind: parsed.data.kind,
      p_key: parsed.data.key,
      p_action: parsed.data.action,
      p_actor_hash: actorHash,
      p_ip_hash: ipHash,
    });
  } catch {
    /* fail-soft — a tracking miss must never surface to the user */
  }
  return noContent();
}
