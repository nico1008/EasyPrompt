-- Database-level publication guard. Private drafts may be incomplete, but no
-- authenticated client can bypass the server compiler and publish malformed JSON.
create or replace function public.template_document_publishable(p_document jsonb)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
declare
  v_block jsonb;
  v_group jsonb;
  v_id text;
  v_group_id text;
  v_kind text;
  v_input_type text;
  v_enabled boolean;
  v_ids text[] := array[]::text[];
  v_group_ids text[] := array[]::text[];
  v_interactive integer := 0;
  v_option_count integer;
  v_unique_options integer;
  v_blank_options integer;
  v_min_pos integer;
  v_max_pos integer;
  v_group_count integer;
begin
  if p_document is null or jsonb_typeof(p_document) <> 'object'
     or p_document ->> 'schema_version' <> '1'
     or jsonb_typeof(p_document -> 'blocks') <> 'array'
     or jsonb_typeof(p_document -> 'form_groups') <> 'array'
     or jsonb_array_length(p_document -> 'blocks') > 60
     or jsonb_array_length(p_document -> 'form_groups') > 8 then
    return false;
  end if;

  for v_group in select value from jsonb_array_elements(p_document -> 'form_groups') loop
    v_id := btrim(coalesce(v_group ->> 'id', ''));
    if v_id = '' or v_id = any(v_group_ids)
       or length(btrim(coalesce(v_group ->> 'title', ''))) not between 1 and 80
       or length(coalesce(v_group ->> 'description', '')) > 200 then return false; end if;
    v_group_ids := array_append(v_group_ids, v_id);
  end loop;

  for v_block in select value from jsonb_array_elements(p_document -> 'blocks') loop
    v_id := btrim(coalesce(v_block ->> 'id', ''));
    v_kind := coalesce(v_block ->> 'kind', '');
    v_enabled := coalesce((v_block ->> 'enabled')::boolean, false);
    if v_id = '' or v_id = any(v_ids) then return false; end if;
    v_ids := array_append(v_ids, v_id);

    if v_kind in ('input', 'optional_toggle') then
      v_group_id := nullif(v_block ->> 'group_id', '');
      if v_group_id is not null and not (v_group_id = any(v_group_ids)) then return false; end if;
      if v_enabled then v_interactive := v_interactive + 1; end if;
      if length(coalesce(v_block ->> 'label', '')) > 80
         or length(coalesce(v_block ->> 'helper', '')) > 160 then return false; end if;
    end if;

    if v_kind = 'content' and v_enabled then
      if btrim(coalesce(v_block ->> 'heading', '')) = '' and btrim(coalesce(v_block ->> 'body', '')) = '' then return false; end if;
      if length(coalesce(v_block ->> 'body', '')) > 8000 then return false; end if;
    elsif v_kind = 'input' and v_enabled then
      if btrim(coalesce(v_block ->> 'label', '')) = '' then return false; end if;
      v_input_type := coalesce(v_block ->> 'input_type', '');
      if v_input_type not in ('short_text', 'long_text', 'single_choice')
         or length(coalesce(v_block ->> 'placeholder', '')) > 160
         or length(coalesce(v_block ->> 'prompt_prefix', '')) > 400
         or length(coalesce(v_block ->> 'prompt_suffix', '')) > 400 then return false; end if;
      if v_input_type = 'single_choice' then
        if jsonb_typeof(v_block -> 'options') <> 'array' then return false; end if;
        select count(*), count(distinct btrim(value)), count(*) filter (where btrim(value) = '')
          into v_option_count, v_unique_options, v_blank_options
        from jsonb_array_elements_text(v_block -> 'options');
        if v_option_count not between 2 and 12 or v_unique_options <> v_option_count or v_blank_options > 0 then return false; end if;
      end if;
    elsif v_kind = 'optional_toggle' and v_enabled then
      if btrim(coalesce(v_block ->> 'label', '')) = ''
         or btrim(coalesce(v_block ->> 'injected_text', '')) = ''
         or length(coalesce(v_block ->> 'injected_text', '')) > 1000 then return false; end if;
    elsif v_kind = 'note' then
      if length(coalesce(v_block ->> 'text', '')) > 8000 then return false; end if;
    elsif v_kind not in ('content', 'input', 'optional_toggle', 'note', 'divider') then
      return false;
    end if;
  end loop;

  if v_interactive < 1 or v_interactive > 20 then return false; end if;

  foreach v_group_id in array v_group_ids loop
    select min(position), max(position), count(*)
      into v_min_pos, v_max_pos, v_group_count
    from (
      select ordinality::integer as position, value ->> 'group_id' as group_id
      from jsonb_array_elements(p_document -> 'blocks') with ordinality
    ) ordered_blocks
    where group_id = v_group_id;
    if v_group_count = 0 or v_max_pos - v_min_pos + 1 <> v_group_count then return false; end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function public.guard_template_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility = 'public' and (
    tg_op = 'INSERT'
    or old.visibility is distinct from new.visibility
    or old.published_revision_id is distinct from new.published_revision_id
  ) then
    if btrim(coalesce(new.title, '')) = ''
       or btrim(coalesce(new.blurb, '')) = ''
       or btrim(coalesce(new.category, '')) = ''
       or new.published_revision_id is null
       or not public.template_document_publishable(new.document) then
      raise exception 'template is not ready to publish';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists user_templates_publication_guard on public.user_templates;
create trigger user_templates_publication_guard
before insert or update of visibility, published_revision_id on public.user_templates
for each row execute function public.guard_template_publication();

revoke all on function public.template_document_publishable(jsonb) from public, anon, authenticated;
revoke all on function public.guard_template_publication() from public, anon, authenticated;
