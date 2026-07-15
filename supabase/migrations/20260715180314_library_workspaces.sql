-- Owner-scoped folders for organizing items in My Library.

create table public.library_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index library_workspaces_owner_updated_idx
  on public.library_workspaces (owner_id, updated_at desc);

create unique index library_workspaces_owner_name_idx
  on public.library_workspaces (owner_id, lower(btrim(name)));

alter table public.library_workspaces enable row level security;

create policy "library_workspaces_owner_all"
  on public.library_workspaces
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger library_workspaces_set_updated_at
  before update on public.library_workspaces
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.library_workspaces to authenticated;

create table public.library_workspace_items (
  workspace_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null check (char_length(item_key) between 3 and 180),
  created_at timestamptz not null default now(),
  primary key (workspace_id, item_key),
  constraint library_workspace_items_workspace_owner_fkey
    foreign key (workspace_id, owner_id)
    references public.library_workspaces (id, owner_id)
    on delete cascade
);

create index library_workspace_items_owner_item_idx
  on public.library_workspace_items (owner_id, item_key);

alter table public.library_workspace_items enable row level security;

create policy "library_workspace_items_owner_all"
  on public.library_workspace_items
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.library_workspace_items to authenticated;
