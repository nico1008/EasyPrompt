-- Canonical Template documents, immutable publication revisions, exact Prompt
-- provenance, and soft deletion. This migration is additive: legacy columns and
-- prompt_notebooks remain available until the migration verification gates pass.

alter table public.user_templates
  add column if not exists document jsonb,
  add column if not exists schema_version integer not null default 1,
  add column if not exists edit_version bigint not null default 1,
  add column if not exists published_revision_id uuid,
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz;

alter table public.user_templates
  drop constraint if exists user_templates_document_size_chk;
alter table public.user_templates
  add constraint user_templates_document_size_chk
  check (document is null or octet_length(document::text) <= 50000);

create table if not exists public.template_revisions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.user_templates(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null,
  source_edit_version bigint not null,
  reason text not null check (reason in ('publish', 'republish', 'manual', 'conflict_overwrite', 'pre_restore', 'private_source')),
  label text,
  title text not null,
  outcome text not null default '',
  category text not null,
  icon text not null,
  document jsonb not null,
  created_at timestamptz not null default now(),
  constraint template_revisions_document_size_chk check (octet_length(document::text) <= 50000)
);

create index if not exists template_revisions_template_created_idx
  on public.template_revisions (template_id, created_at desc);
create index if not exists template_revisions_owner_idx
  on public.template_revisions (owner_id);

alter table public.template_revisions enable row level security;

drop policy if exists template_revisions_owner_read on public.template_revisions;
create policy template_revisions_owner_read
  on public.template_revisions for select to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on public.template_revisions from anon;
revoke all on public.template_revisions from authenticated;
grant select on public.template_revisions to authenticated;

alter table public.user_templates
  drop constraint if exists user_templates_published_revision_fk;
alter table public.user_templates
  add constraint user_templates_published_revision_fk
  foreign key (published_revision_id) references public.template_revisions(id)
  on delete restrict deferrable initially deferred;

create table if not exists public.legacy_template_map (
  id uuid primary key default gen_random_uuid(),
  legacy_source_kind text not null check (legacy_source_kind in ('prompt_notebook', 'user_template')),
  legacy_source_id uuid not null,
  canonical_template_id uuid references public.user_templates(id) on delete set null,
  migration_status text not null check (migration_status in ('pending', 'migrated', 'needs_review', 'waived')),
  source_checksum text,
  target_checksum text,
  original_slug text,
  error_reason text,
  migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_kind, legacy_source_id)
);

create table if not exists public.template_route_redirects (
  id uuid primary key default gen_random_uuid(),
  legacy_path text not null unique,
  canonical_template_id uuid references public.user_templates(id) on delete set null,
  canonical_slug text,
  status_code integer not null default 308 check (status_code in (301, 308, 410)),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.legacy_template_map enable row level security;
alter table public.template_route_redirects enable row level security;
revoke all on public.legacy_template_map from anon, authenticated;
revoke all on public.template_route_redirects from anon, authenticated;

alter table public.saved_prompts
  add column if not exists template_key text,
  add column if not exists template_revision_id uuid references public.template_revisions(id) on delete set null,
  add column if not exists template_content_revision integer,
  add column if not exists source_surface text,
  add column if not exists source_title_snapshot text,
  add column if not exists source_author_snapshot text,
  add column if not exists source_slug_snapshot text,
  add column if not exists source_snapshot jsonb,
  add column if not exists source_created_at timestamptz;

alter table public.saved_prompts
  drop constraint if exists saved_prompts_user_template_id_fkey;
alter table public.saved_prompts
  add constraint saved_prompts_user_template_id_fkey
  foreign key (user_template_id) references public.user_templates(id) on delete set null;

alter table public.saved_prompts drop constraint if exists saved_prompts_source_chk;
alter table public.saved_prompts
  add constraint saved_prompts_source_chk check (
    (source_kind = 'catalog' and catalog_slug is not null)
    or (source_kind = 'user' and (user_template_id is not null or template_key like 'user:%'))
    or (source_kind in ('import', 'manual', 'ai') and catalog_slug is null and user_template_id is null)
  );

create index if not exists saved_prompts_template_revision_idx
  on public.saved_prompts (template_revision_id);
create index if not exists saved_prompts_template_key_idx
  on public.saved_prompts (template_key);

create or replace function public.save_template_edit(
  p_template_id uuid,
  p_expected_edit_version bigint,
  p_document jsonb,
  p_title text,
  p_outcome text,
  p_category text,
  p_icon text
)
returns table(template_id uuid, edit_version bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_version bigint;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  if p_document is null or octet_length(p_document::text) > 50000 then
    raise exception 'invalid template document';
  end if;

  select owner_id, user_templates.edit_version into v_owner, v_version
  from public.user_templates
  where id = p_template_id and deleted_at is null
  for update;

  if v_owner is null then raise exception 'template not found'; end if;
  if v_owner <> (select auth.uid()) then raise exception 'not authorized'; end if;
  if v_version <> p_expected_edit_version then raise exception 'edit conflict'; end if;

  update public.user_templates
  set document = p_document,
      schema_version = coalesce((p_document ->> 'schema_version')::integer, 1),
      title = p_title,
      blurb = p_outcome,
      category = p_category,
      icon = p_icon,
      edit_version = user_templates.edit_version + 1
  where id = p_template_id
  returning id, user_templates.edit_version into template_id, edit_version;
  return next;
end;
$$;

create or replace function public.publish_template_revision(
  p_template_id uuid,
  p_expected_edit_version bigint,
  p_share_slug text
)
returns table(revision_id uuid, share_slug text, edit_version bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.user_templates%rowtype;
  v_revision uuid;
  v_reason text;
  v_slug text;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  select * into v_template from public.user_templates
  where id = p_template_id and deleted_at is null for update;
  if v_template.id is null then raise exception 'template not found'; end if;
  if v_template.owner_id <> (select auth.uid()) then raise exception 'not authorized'; end if;
  if v_template.edit_version <> p_expected_edit_version then raise exception 'edit conflict'; end if;
  if v_template.document is null then raise exception 'template document missing'; end if;
  if octet_length(v_template.document::text) > 50000 then raise exception 'template document too large'; end if;

  v_reason := case when v_template.published_revision_id is null then 'publish' else 'republish' end;
  v_slug := coalesce(v_template.share_slug, nullif(trim(p_share_slug), ''));
  if v_slug is null then raise exception 'share slug required'; end if;

  insert into public.template_revisions (
    template_id, owner_id, schema_version, source_edit_version, reason,
    title, outcome, category, icon, document
  ) values (
    v_template.id, v_template.owner_id, v_template.schema_version,
    v_template.edit_version, v_reason, v_template.title,
    coalesce(v_template.blurb, ''), v_template.category, v_template.icon,
    v_template.document
  ) returning id into v_revision;

  update public.user_templates
  set published_revision_id = v_revision,
      visibility = 'public',
      is_public = true,
      share_slug = v_slug
  where id = v_template.id;

  revision_id := v_revision;
  share_slug := v_slug;
  edit_version := v_template.edit_version;
  return next;
end;
$$;

create or replace function public.snapshot_template_revision(
  p_template_id uuid,
  p_expected_edit_version bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.user_templates%rowtype;
  v_revision uuid;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  select * into v_template from public.user_templates
  where id = p_template_id and deleted_at is null for update;
  if v_template.id is null then raise exception 'template not found'; end if;
  if v_template.owner_id <> (select auth.uid()) then raise exception 'not authorized'; end if;
  if v_template.edit_version <> p_expected_edit_version then raise exception 'edit conflict'; end if;
  if v_template.document is null then raise exception 'template document missing'; end if;

  select id into v_revision from public.template_revisions
  where template_id = v_template.id
    and source_edit_version = v_template.edit_version
    and reason = 'private_source'
  order by created_at desc limit 1;

  if v_revision is null then
    insert into public.template_revisions (
      template_id, owner_id, schema_version, source_edit_version, reason,
      title, outcome, category, icon, document
    ) values (
      v_template.id, v_template.owner_id, v_template.schema_version,
      v_template.edit_version, 'private_source', v_template.title,
      coalesce(v_template.blurb, ''), v_template.category, v_template.icon,
      v_template.document
    ) returning id into v_revision;
  end if;
  return v_revision;
end;
$$;

create or replace function public.unpublish_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  update public.user_templates
  set visibility = 'private', is_public = false
  where id = p_template_id and owner_id = (select auth.uid()) and deleted_at is null;
  if not found then raise exception 'template not found'; end if;
end;
$$;

create or replace function public.soft_delete_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  update public.user_templates
  set visibility = 'private', is_public = false,
      deleted_at = now(), delete_after = now() + interval '30 days'
  where id = p_template_id and owner_id = (select auth.uid()) and deleted_at is null;
  if not found then raise exception 'template not found'; end if;
end;
$$;

create or replace function public.restore_deleted_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  update public.user_templates
  set deleted_at = null, delete_after = null, visibility = 'private', is_public = false
  where id = p_template_id and owner_id = (select auth.uid())
    and deleted_at is not null and delete_after > now();
  if not found then raise exception 'template cannot be restored'; end if;
end;
$$;

create or replace function public.public_template_revision(p_slug text)
returns table(
  template_id uuid,
  template_key text,
  revision_id uuid,
  title text,
  outcome text,
  category text,
  icon text,
  document jsonb,
  share_slug text,
  author_username text,
  author_display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select ut.id, 'user:' || ut.id::text, tr.id, tr.title, tr.outcome,
         tr.category, tr.icon, tr.document, ut.share_slug,
         p.username,
         case when p.username is not null then p.display_name else null end
  from public.user_templates ut
  join public.template_revisions tr on tr.id = ut.published_revision_id
  left join public.profiles p on p.id = ut.owner_id
  where ut.share_slug = p_slug
    and ut.visibility = 'public'
    and ut.deleted_at is null
  limit 1
$$;

revoke all on function public.save_template_edit(uuid, bigint, jsonb, text, text, text, text) from public, anon;
revoke all on function public.publish_template_revision(uuid, bigint, text) from public, anon;
revoke all on function public.snapshot_template_revision(uuid, bigint) from public, anon;
revoke all on function public.unpublish_template(uuid) from public, anon;
revoke all on function public.soft_delete_template(uuid) from public, anon;
revoke all on function public.restore_deleted_template(uuid) from public, anon;
revoke all on function public.public_template_revision(text) from public;
grant execute on function public.save_template_edit(uuid, bigint, jsonb, text, text, text, text) to authenticated;
grant execute on function public.publish_template_revision(uuid, bigint, text) to authenticated;
grant execute on function public.snapshot_template_revision(uuid, bigint) to authenticated;
grant execute on function public.unpublish_template(uuid) to authenticated;
grant execute on function public.soft_delete_template(uuid) to authenticated;
grant execute on function public.restore_deleted_template(uuid) to authenticated;
grant execute on function public.public_template_revision(text) to anon, authenticated;
