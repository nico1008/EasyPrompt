-- Owner-only manual history and restore. Restoring creates a new editable
-- version and never moves the public published_revision_id pointer.

create or replace function public.snapshot_template_version(
  p_template_id uuid,
  p_label text default null
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
  where id = p_template_id and deleted_at is null;
  if v_template.id is null then raise exception 'template not found'; end if;
  if v_template.owner_id <> (select auth.uid()) then raise exception 'not authorized'; end if;
  if v_template.document is null then raise exception 'template document missing'; end if;

  insert into public.template_revisions (
    template_id, owner_id, schema_version, source_edit_version, reason, label,
    title, outcome, category, icon, document
  ) values (
    v_template.id, v_template.owner_id, v_template.schema_version,
    v_template.edit_version, 'manual', nullif(left(trim(p_label), 80), ''),
    v_template.title, coalesce(v_template.blurb, ''), v_template.category,
    v_template.icon, v_template.document
  ) returning id into v_revision;
  return v_revision;
end;
$$;

create or replace function public.restore_template_version(
  p_template_id uuid,
  p_revision_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.user_templates%rowtype;
  v_revision public.template_revisions%rowtype;
  v_version bigint;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  select * into v_template from public.user_templates
  where id = p_template_id and deleted_at is null for update;
  if v_template.id is null then raise exception 'template not found'; end if;
  if v_template.owner_id <> (select auth.uid()) then raise exception 'not authorized'; end if;
  select * into v_revision from public.template_revisions
  where id = p_revision_id and template_id = p_template_id and owner_id = (select auth.uid());
  if v_revision.id is null then raise exception 'revision not found'; end if;

  if v_template.document is not null then
    insert into public.template_revisions (
      template_id, owner_id, schema_version, source_edit_version, reason,
      title, outcome, category, icon, document
    ) values (
      v_template.id, v_template.owner_id, v_template.schema_version,
      v_template.edit_version, 'pre_restore', v_template.title,
      coalesce(v_template.blurb, ''), v_template.category, v_template.icon,
      v_template.document
    );
  end if;

  update public.user_templates
  set document = v_revision.document,
      schema_version = v_revision.schema_version,
      title = v_revision.title,
      blurb = v_revision.outcome,
      category = v_revision.category,
      icon = v_revision.icon,
      edit_version = user_templates.edit_version + 1
  where id = p_template_id
  returning edit_version into v_version;
  return v_version;
end;
$$;

revoke all on function public.snapshot_template_version(uuid, text) from public, anon;
revoke all on function public.restore_template_version(uuid, uuid) from public, anon;
grant execute on function public.snapshot_template_version(uuid, text) to authenticated;
grant execute on function public.restore_template_version(uuid, uuid) to authenticated;
