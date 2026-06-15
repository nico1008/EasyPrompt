-- EasyPrompt — ratings, bookmarks, and block-based notebooks.
-- Apply via Supabase Dashboard → SQL Editor (paste + Run) or `supabase db push`.
-- Apply this migration to the project BEFORE deploying the matching code.
--
-- Three additive features, all owner-scoped via RLS (auth.uid() = owner_id), no
-- service-role key, anon kept at zero table access (mirrors 0004). The one
-- exception is the rating_aggregate() RPC: a security-definer function that
-- returns only avg+count (never individual rows), so the public catalog can show
-- aggregate ratings without exposing who rated what. Same pattern as
-- delete_current_user() in 0001.
--
-- Ratings/bookmarks target the public catalog (target_kind = 'catalog',
-- target_key = catalog slug). target_kind reserves the extension path
-- ('user'/'notebook') for when the parked is_public sharing seam becomes real.

-- ============================================================================
-- prompt_ratings  (1–5 rating; one per user per target; owner-only rows)
-- ============================================================================
create table if not exists public.prompt_ratings (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('catalog')),
  target_key  text not null,
  rating      smallint not null check (rating between 1 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, target_kind, target_key)
);

create index if not exists prompt_ratings_target_idx
  on public.prompt_ratings (target_kind, target_key);

alter table public.prompt_ratings enable row level security;

create policy "prompt_ratings_owner_all"
  on public.prompt_ratings for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create trigger prompt_ratings_set_updated_at before update on public.prompt_ratings
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.prompt_ratings to authenticated;

-- Aggregate read without leaking individual rows or using a service-role key.
-- security definer + search_path='' + fully-qualified table, matching the
-- codebase convention (see public.delete_current_user / public.set_updated_at).
create or replace function public.rating_aggregate(p_target_kind text, p_target_key text)
returns table(avg numeric, count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(avg(rating), 0)::numeric, count(*)::bigint
  from public.prompt_ratings
  where target_kind = p_target_kind and target_key = p_target_key;
$$;

revoke all on function public.rating_aggregate(text, text) from public;
grant execute on function public.rating_aggregate(text, text) to anon, authenticated;

-- ============================================================================
-- bookmarks  (a user's saved catalog templates; insert/delete only)
-- ============================================================================
create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('catalog')),
  target_key  text not null,
  created_at  timestamptz not null default now(),
  unique (owner_id, target_kind, target_key)
);

create index if not exists bookmarks_owner_created_idx
  on public.bookmarks (owner_id, created_at desc);

alter table public.bookmarks enable row level security;

create policy "bookmarks_owner_all"
  on public.bookmarks for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

grant select, insert, update, delete on public.bookmarks to authenticated;

-- ============================================================================
-- prompt_notebooks  (block-based builder documents; owner-only)
-- ============================================================================
create table if not exists public.prompt_notebooks (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  doc        jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompt_notebooks_owner_updated_idx
  on public.prompt_notebooks (owner_id, updated_at desc);

alter table public.prompt_notebooks enable row level security;

create policy "prompt_notebooks_owner_all"
  on public.prompt_notebooks for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create trigger prompt_notebooks_set_updated_at before update on public.prompt_notebooks
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.prompt_notebooks to authenticated;
