# Security

EasyPrompt enforces authorization in the database with **Row-Level Security** (every row is
owner-scoped to `auth.uid()`), keeps all secrets server-side, and ships with security headers on
every route. This file is the **production hardening checklist** plus a record of reviewed,
accepted exceptions.

## Production hardening checklist (one-time, per Supabase project)

These four steps close the gaps a fresh project ships with. Do them before going live.

1. **Apply migrations through `0004`.** Run every file in
   [`supabase/migrations/`](supabase/migrations/) in order (`0001` → `0004`) via the SQL Editor, or
   `supabase db push`. `0004_security_hardening.sql` revokes the default PUBLIC execute grant on the
   `handle_new_user()` trigger helper, drops all anon table privileges (no anonymous feature needs
   them), and parks the `is_public` public-read seam.
2. **Authentication → Policies → enable "Leaked password protection".** Blocks known-breached
   passwords (HaveIBeenPwned). Off by default.
3. **Authentication → Providers → Email → "Confirm email" = ON** (production). Without it, anyone can
   register an address they don't control and get an immediate session.
4. **Authentication → enable "Prevent user existence errors".** Pairs with the app's neutral signup
   response so signup/login can't be used to enumerate which emails have accounts.

After applying `0004`, re-run the Supabase **Security Advisor**. The two
`*_security_definer_function_executable` warnings for `handle_new_user` should clear. The one for
`delete_current_user` is expected — see below.

## Reviewed & accepted exceptions

- **`public.delete_current_user()` is `SECURITY DEFINER`, executable by `authenticated`** (Advisor
  lint 0029). This is **intentional and safe**. It is the self-serve account-deletion RPC: `SECURITY
  DEFINER` is required because the `authenticated` role cannot delete from `auth.users`, and the body
  is guarded to `where id = auth.uid()`, so a caller can only ever delete **their own** account. It
  must stay in the exposed schema so the client `.rpc("delete_current_user")` can reach it. Keeping it
  is the reason the app needs **no service-role key**. Do not "fix" it to `SECURITY INVOKER` (that
  breaks deletion).
- **Residual `postcss < 8.5.10` (moderate) in `npm audit`.** Pulled in transitively by
  `next` → `@vercel/analytics`; it is a **build-time** dependency that only stringifies the app's own
  first-party CSS. The vulnerable path (stringifying *untrusted* CSS) is never reached at runtime. Do
  **not** run `npm audit fix --force` — its "fix" downgrades `next` to 9.3.3, a catastrophic breaking
  change. Clear it by upgrading `next` once it ships a build depending on `postcss ≥ 8.5.10`.

## Controls in place (don't regress these)

- **RLS on every table**, owner-scoped to `auth.uid()`; server reads/writes go through RLS-scoped
  repos and every mutation re-checks `getUser()` (JWT-revalidated, never `getSession()`).
- **All mutations are Server Actions** (Origin-checked by Next = CSRF defense) or bearer-token API
  routes; inputs are Zod-validated.
- **No service-role key** anywhere; **secrets are server-only** (`process.env`, never `NEXT_PUBLIC_*`).
- **Security headers** on every route (`next.config.mjs`): enforced CSP, `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.
- **Rate limiting** on `/api/entitlement` (10/min/IP) and `/api/premium` (60/min/IP) — see
  [`lib/rateLimit.ts`](lib/rateLimit.ts). Note: best-effort in-memory/per-instance; for a durable
  cross-instance quota, swap in Upstash Ratelimit behind the same `checkRateLimit` signature.

## Known limitation — Pro code sharing (needs a product decision)

Pro access codes are verified offline (stateless HMAC) and the resulting session token carries no
user/device binding, so a single purchased code (or a copied token) can be shared to unlimited
people — pure revenue leakage, **no data exposure or account compromise**. Enforcing a per-code
redemption cap requires adding state to the deliberately stateless path (a `redeemed_codes` table +
a `SECURITY DEFINER` claim function callable by `anon`, gated on `isSupabaseConfigured()` so
Supabase-less deployments still work). It is **not built** pending a product call on the
cost/anti-sharing tradeoff. The `entitlements.code_hash` column already exists as the seam for it.

## Reporting

Found a vulnerability? Email security@easyprompt.app rather than opening a public issue.
