-- EasyPrompt — user accounts schema.
-- Tables: profiles, user_templates, saved_prompts (all RLS-protected).
-- Apply via Supabase Dashboard → SQL Editor (paste + Run) or `supabase db push`.
-- Run once on a fresh project.

-- ============================================================================
-- profiles  (1:1 with auth.users — app-level user data we own)
-- ============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- user_templates  (user-authored custom templates; mirrors the Template shape)
-- ============================================================================
create table if not exists public.user_templates (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  slug        text,
  title       text not null,
  category    text not null,
  icon        text not null,
  tag         text,
  blurb       text,
  intro       text,
  base_prompt text not null,
  fields      jsonb not null default '[]'::jsonb,
  checkboxes  jsonb not null default '[]'::jsonb,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, slug)
);

create index if not exists user_templates_owner_updated_idx
  on public.user_templates (owner_id, updated_at desc);

alter table public.user_templates enable row level security;

-- Owner has full CRUD on their own templates.
create policy "user_templates_owner_all"
  on public.user_templates for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Sharing seam (not surfaced in the UI yet): anyone may read a public template.
create policy "user_templates_public_read"
  on public.user_templates for select
  using (is_public = true);

-- ============================================================================
-- saved_prompts  (saved fill-ins / "Answers" of a catalog or user template)
-- ============================================================================
create table if not exists public.saved_prompts (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  source_kind      text not null check (source_kind in ('catalog','user')),
  catalog_slug     text,
  user_template_id uuid references public.user_templates(id) on delete cascade,
  answers          jsonb not null default '{}'::jsonb,
  generated_text   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint saved_prompts_source_chk check (
    (source_kind = 'catalog' and catalog_slug is not null and user_template_id is null)
    or
    (source_kind = 'user' and user_template_id is not null and catalog_slug is null)
  )
);

create index if not exists saved_prompts_owner_updated_idx
  on public.saved_prompts (owner_id, updated_at desc);

alter table public.saved_prompts enable row level security;

create policy "saved_prompts_owner_all"
  on public.saved_prompts for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================================
-- updated_at maintenance
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at        before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger user_templates_set_updated_at  before update on public.user_templates
  for each row execute function public.set_updated_at();
create trigger saved_prompts_set_updated_at   before update on public.saved_prompts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- self-serve account deletion (no service-role key in app code)
-- security definer so it can delete from auth.users; guarded to the caller only.
-- ============================================================================
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;

-- ============================================================================
-- role grants (RLS still restricts rows; these grant table-level access).
-- Supabase usually sets these via default privileges, but we make the migration
-- self-contained.
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.profiles, public.user_templates, public.saved_prompts
  to authenticated;
grant select on public.user_templates to anon; -- for the is_public sharing seam
