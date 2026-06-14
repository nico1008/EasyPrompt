-- EasyPrompt — security hardening (audit remediation).
-- Apply via Supabase Dashboard → SQL Editor (paste + Run) or `supabase db push`.
-- Idempotent: every statement is safe to run more than once.
--
-- Addresses three audit findings, none of which is exploitable today but each of
-- which tightens the attack surface / enforces least privilege:
--
--   #1  public.handle_new_user() is a TRIGGER-only helper, yet PostgreSQL's
--       default PUBLIC execute grant left it callable as an RPC
--       (/rest/v1/rpc/handle_new_user) by anon + authenticated. Calling a
--       `returns trigger` function directly errors out ("trigger functions can
--       only be called as triggers"), so nothing can be forged — but it has no
--       business being in the exposed API. Revoke EXECUTE.
--
--   #8  Supabase's platform defaults grant anon FULL table privileges
--       (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/…) on every public table. RLS
--       blocks anon at the row level today, but that makes RLS the *only* gate.
--       No anonymous feature needs any table access (the one that did — the
--       is_public read seam — is removed below), so revoke all of it: defense in
--       depth, so a future table shipped without RLS can't inherit world access
--       through anon.
--
--   #7  The user_templates "public read" sharing seam (is_public = true,
--       readable by anon) shipped ahead of any UI/consent and exposes every
--       column (including owner_id) of a flipped row. Park the seam until sharing
--       is a real, column-scoped feature. The app side stops accepting is_public
--       (lib/userTemplates/validate.ts); there are no public rows today.

-- ── #1 — handle_new_user() is trigger-only: take it out of the RPC surface ────
-- The on_auth_user_created trigger keeps firing: trigger execution does NOT
-- check the session role's EXECUTE privilege, so revoking it is transparent.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── #7 — park the is_public sharing seam ─────────────────────────────────────
drop policy if exists "user_templates_public_read" on public.user_templates;

-- ── #8 — least privilege: anon needs no table access at all ──────────────────
-- (Schema usage is left intact — anon still needs it for auth + RPC.)
revoke all privileges on public.profiles        from anon;
revoke all privileges on public.user_templates  from anon;
revoke all privileges on public.saved_prompts   from anon;
revoke all privileges on public.entitlements    from anon;

-- Note: `authenticated` keeps its table privileges; RLS scopes those rows to the
-- owner (auth.uid() = owner_id). We intentionally do NOT touch the authenticated
-- grants here — the app's logged-in features depend on them.
