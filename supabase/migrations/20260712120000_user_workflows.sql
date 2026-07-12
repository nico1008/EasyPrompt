-- Complete owner-authored Workflow entity. Public reads are RPC-only.
create table public.user_workflows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  category text not null,
  blurb text not null default '',
  overview text not null default '',
  time_label text not null default '',
  document jsonb not null default '{"version":1,"prerequisites":[],"steps":[]}'::jsonb,
  document_version integer not null default 1 check (document_version = 1),
  revision integer not null default 1 check (revision > 0),
  visibility public.content_visibility not null default 'private',
  share_slug text unique,
  source_kind text check (source_kind in ('catalog_workflow', 'user_workflow')),
  source_catalog_id text,
  source_workflow_id uuid,
  source_title_snapshot text,
  source_author_snapshot text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(title) <= 100),
  check (char_length(category) <= 60),
  check (char_length(blurb) <= 300),
  check (char_length(overview) <= 2000),
  check (char_length(time_label) <= 100),
  check (octet_length(document::text) <= 250000)
);

create index user_workflows_owner_updated_idx on public.user_workflows(owner_id, updated_at desc);
create index user_workflows_public_created_idx on public.user_workflows(created_at desc) where visibility = 'public';

alter table public.user_workflows enable row level security;
grant select, insert, update, delete on public.user_workflows to authenticated;

create policy user_workflows_owner_select on public.user_workflows for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy user_workflows_owner_insert on public.user_workflows for insert to authenticated
  with check ((select auth.uid()) = owner_id and visibility = 'private' and share_slug is null);
create policy user_workflows_owner_update on public.user_workflows for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy user_workflows_owner_delete on public.user_workflows for delete to authenticated
  using ((select auth.uid()) = owner_id);

create function public.guard_user_workflow_privileged_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id <> old.owner_id then raise exception 'workflow owner cannot change'; end if;
  if new.visibility <> old.visibility and coalesce(current_setting('easyprompt.workflow_publish', true), '') <> 'allowed' then
    raise exception 'use publish_workflow';
  end if;
  if new.share_slug is distinct from old.share_slug and coalesce(current_setting('easyprompt.workflow_publish', true), '') <> 'allowed' then
    raise exception 'use publish_workflow';
  end if;
  return new;
end $$;
revoke all on function public.guard_user_workflow_privileged_fields() from public;
create trigger guard_user_workflow_privileged_fields before update on public.user_workflows
for each row execute function public.guard_user_workflow_privileged_fields();

create function public.publish_workflow(p_id uuid, p_revision integer, p_share_slug text, p_publish boolean)
returns table(share_slug text, revision integer)
language plpgsql security definer set search_path = '' as $$
declare w public.user_workflows%rowtype;
begin
  select * into w from public.user_workflows where id = p_id and owner_id = auth.uid() for update;
  if not found then raise exception 'not found'; end if;
  if w.revision <> p_revision then raise exception 'stale revision'; end if;
  if p_publish and (
    btrim(w.title) = '' or btrim(w.blurb) = '' or btrim(w.overview) = '' or btrim(w.time_label) = '' or
    jsonb_typeof(w.document->'steps') <> 'array' or jsonb_array_length(w.document->'steps') = 0
  ) then raise exception 'workflow is incomplete'; end if;
  perform set_config('easyprompt.workflow_publish', 'allowed', true);
  update public.user_workflows
    set visibility = case when p_publish then 'public' else 'private' end,
        share_slug = case when p_publish then coalesce(w.share_slug, p_share_slug) else w.share_slug end,
        published_at = case when p_publish then coalesce(w.published_at, now()) else w.published_at end,
        revision = w.revision + 1, updated_at = now()
    where id = p_id;
  return query select uw.share_slug, uw.revision from public.user_workflows uw where uw.id = p_id;
end $$;
revoke all on function public.publish_workflow(uuid, integer, text, boolean) from public;
revoke execute on function public.publish_workflow(uuid, integer, text, boolean) from anon;
grant execute on function public.publish_workflow(uuid, integer, text, boolean) to authenticated;

create function public.community_workflow(p_slug text)
returns table(id uuid, title text, category text, blurb text, overview text, time_label text,
  document jsonb, document_version integer, source_kind text, source_catalog_id text,
  source_title_snapshot text, source_author_snapshot text, author_username text)
language sql stable security definer set search_path = '' as $$
  select w.id, w.title, w.category, w.blurb, w.overview, w.time_label, w.document,
    w.document_version, w.source_kind, w.source_catalog_id, w.source_title_snapshot,
    w.source_author_snapshot, p.username
  from public.user_workflows w left join public.profiles p on p.id = w.owner_id
  where w.visibility = 'public' and w.share_slug = p_slug
$$;
revoke all on function public.community_workflow(text) from public;
grant execute on function public.community_workflow(text) to anon, authenticated;

create function public.published_workflows(p_limit integer, p_offset integer)
returns table(id uuid, share_slug text, title text, category text, blurb text, time_label text,
  created_at timestamptz, updated_at timestamptz, author_username text)
language sql stable security definer set search_path = '' as $$
  select w.id, w.share_slug, w.title, w.category, w.blurb, w.time_label,
    w.created_at, w.updated_at, p.username
  from public.user_workflows w left join public.profiles p on p.id = w.owner_id
  where w.visibility = 'public' and w.share_slug is not null
  order by w.created_at desc, w.id
  limit greatest(coalesce(p_limit, 24), 0) offset greatest(coalesce(p_offset, 0), 0)
$$;
revoke all on function public.published_workflows(integer, integer) from public;
grant execute on function public.published_workflows(integer, integer) to anon, authenticated;

create function public.public_profile_workflows(p_username text)
returns table(id uuid, share_slug text, title text, category text, blurb text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select w.id, w.share_slug, w.title, w.category, w.blurb, w.updated_at
  from public.user_workflows w join public.profiles p on p.id = w.owner_id
  where p.username = lower(p_username) and w.visibility = 'public' and w.share_slug is not null
  order by w.updated_at desc, w.id
$$;
revoke all on function public.public_profile_workflows(text) from public;
grant execute on function public.public_profile_workflows(text) to anon, authenticated;

alter table public.bookmarks drop constraint if exists bookmarks_target_kind_check;
alter table public.bookmarks add constraint bookmarks_target_kind_check
  check (target_kind in ('catalog', 'example_prompt', 'user_template', 'user_prompt', 'catalog_workflow', 'user_workflow'));
