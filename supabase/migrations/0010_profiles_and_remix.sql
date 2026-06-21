-- EasyPrompt — Phase 3 groundwork: opt-in public profiles + remix attribution.
-- Apply via Supabase Dashboard → SQL Editor or `supabase db push`, BEFORE deploying
-- the matching code. ADDITIVE ONLY.
--
-- profiles.is_public defaults FALSE: every existing and new account stays private
-- until the owner opts in on /account. A public profile is a NEW exposure (it
-- aggregates identity + stats across all the owner's published content), so it must
-- be explicit. saved_prompts.remixed_from gives "Use as starting point" a structured
-- source pointer.

alter table public.profiles
  add column if not exists bio text;
alter table public.profiles
  add column if not exists is_public boolean not null default false;

alter table public.saved_prompts
  add column if not exists remixed_from uuid references public.saved_prompts(id) on delete set null;
