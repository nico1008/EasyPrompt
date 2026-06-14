/* GET /api/premium — requires Authorization: Bearer <token>.
 *
 * Verifies the session token and returns the server-protected premium content
 * (Pro Boosters). This module is the ONLY way to read that content — the
 * booster source is `import "server-only"` and never enters the client bundle.
 * Stateless edge function; never cached. Optional ?template=<id> tailors the set. */

import { verifyToken } from "@/lib/access/token";
import { getBoosters } from "@/data/premium/boosters";

const NO_STORE = { "Cache-Control": "no-store", "Content-Type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE });
}

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1] : null;
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.ACCESS_SIGNING_SECRET;
  if (!secret) return json({ error: "server-misconfigured" }, 500);

  const token = bearer(req);
  if (!token) return json({ error: "unauthorized" }, 401);

  const result = await verifyToken(secret, token, new Date());
  if (!result.valid || !result.payload) {
    return json({ error: "unauthorized" }, 401);
  }

  const templateId = new URL(req.url).searchParams.get("template") ?? undefined;
  return json({ plan: result.payload.plan, boosters: getBoosters(templateId) }, 200);
}
