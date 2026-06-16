-- EasyPrompt — prompt builder version history + safe public sharing.
-- Apply via Supabase Dashboard → SQL Editor (paste + Run) or `supabase db push`.
-- Apply this migration AFTER 0005 and BEFORE deploying the matching code.
--
-- Two additive features for the block builder (prompt_notebooks):
--
--  1. Version history — prompt_notebook_versions, owner-scoped via RLS
--     (auth.uid() = owner_id), no service-role key. Each row is a point-in-time
--     snapshot of a notebook's doc. The app prunes to the latest ~20 per notebook.
--
--  2. Public sharing — capability-based, NOT a public-read policy. RLS on
--     prompt_notebooks stays owner-only and anon keeps ZERO table grants. A
--     notebook is shared only when it has an unguessable share_slug, and the only
--     public read path is the security-definer shared_notebook(slug) RPC, which
--     returns name+doc for an EXACT slug (no enumeration, no owner_id/email leak).
--     Same pattern as rating_aggregate() (0005) / delete_current_user() (0001).
--     This deliberately keeps the parked is_public seam closed at the table level.

-- ============================================================================
-- prompt_notebooks: add the share capability column (null = private)
-- ============================================================================
alter table public.prompt_notebooks
  add column if not exists share_slug text unique;

-- ============================================================================
-- prompt_notebook_versions  (point-in-time snapshots; owner-only)
-- ============================================================================
create table if not exists public.prompt_notebook_versions (
  id          uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.prompt_notebooks(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  doc         jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists prompt_notebook_versions_book_idx
  on public.prompt_notebook_versions (notebook_id, created_at desc);

alter table public.prompt_notebook_versions enable row level security;

create policy "prompt_notebook_versions_owner_all"
  on public.prompt_notebook_versions for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

grant select, insert, update, delete on public.prompt_notebook_versions to authenticated;

-- ============================================================================
-- shared_notebook(slug): the only public read path for a shared notebook.
-- security definer + search_path='' + fully-qualified table, matching the
-- codebase convention (see public.rating_aggregate / public.delete_current_user).
-- Returns name+doc for an exact slug only; never lists rows, never exposes owner.
-- ============================================================================
create or replace function public.shared_notebook(p_slug text)
returns table(name text, doc jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select name, doc
  from public.prompt_notebooks
  where share_slug = p_slug
$$;

revoke all on function public.shared_notebook(text) from public;
grant execute on function public.shared_notebook(text) to anon, authenticated;
