-- Explicit conflict recovery. No document merging is attempted: the owner may
-- replace the server draft only after the UI confirms the choice. The displaced
-- server state is retained as an immutable revision first.

create or replace function public.overwrite_template_edit(
  p_template_id uuid,
  p_document jsonb,
  p_title text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.user_templates%rowtype;
  v_version bigint;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  if p_document is null or octet_length(p_document::text) > 50000 then
    raise exception 'invalid template document';
  end if;

  select * into v_template from public.user_templates
  where id = p_template_id and deleted_at is null for update;
  if v_template.id is null then raise exception 'template not found'; end if;
  if v_template.owner_id <> (select auth.uid()) then raise exception 'not authorized'; end if;
  if v_template.document is not null then
    insert into public.template_revisions (
      template_id, owner_id, schema_version, source_edit_version, reason,
      title, outcome, category, icon, document
    ) values (
      v_template.id, v_template.owner_id, v_template.schema_version,
      v_template.edit_version, 'conflict_overwrite', v_template.title,
      coalesce(v_template.blurb, ''), v_template.category, v_template.icon,
      v_template.document
    );
  end if;

  update public.user_templates
  set document = p_document,
      schema_version = coalesce((p_document ->> 'schema_version')::integer, 1),
      title = p_title,
      edit_version = user_templates.edit_version + 1
  where id = p_template_id
  returning edit_version into v_version;
  return v_version;
end;
$$;

revoke all on function public.overwrite_template_edit(uuid, jsonb, text) from public, anon;
grant execute on function public.overwrite_template_edit(uuid, jsonb, text) to authenticated;
