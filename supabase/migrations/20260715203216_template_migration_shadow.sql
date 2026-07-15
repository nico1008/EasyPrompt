-- Backfill the canonical document for legacy user_templates and register every
-- legacy source in the reconciliation map. prompt_notebooks remain authoritative
-- until application parity tooling marks each mapping migrated.

with canonical as (
  select
    ut.id,
    jsonb_build_object(
      'schema_version', 1,
      'form_groups', '[]'::jsonb,
      'blocks',
        jsonb_build_array(
          jsonb_build_object(
            'id', 'content_' || replace(ut.id::text, '-', ''),
            'kind', 'content',
            'purpose', 'instruction',
            'body', ut.base_prompt,
            'enabled', true
          )
        )
        || coalesce((
          select jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
              'id', f.value ->> 'id',
              'kind', 'input',
              'input_type', case
                when f.value ->> 'type' = 'textarea' then 'long_text'
                when f.value ->> 'type' in ('select', 'pills') then 'single_choice'
                else 'short_text'
              end,
              'presentation', case
                when f.value ->> 'type' = 'select' then 'dropdown'
                when f.value ->> 'type' = 'pills' then 'pills'
                else null
              end,
              'label', coalesce(f.value ->> 'label', ''),
              'helper', f.value ->> 'helper',
              'placeholder', f.value ->> 'placeholder',
              'required', coalesce((f.value ->> 'required')::boolean, false),
              'options', case when f.value ->> 'type' in ('select', 'pills') then f.value -> 'options' else null end,
              'prompt_prefix', coalesce(f.value ->> 'prefix', ''),
              'suggested_answer', f.value ->> 'default',
              'enabled', true
            )) order by f.ordinality
          )
          from jsonb_array_elements(ut.fields) with ordinality as f(value, ordinality)
        ), '[]'::jsonb)
        || coalesce((
          select jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
              'id', c.value ->> 'id',
              'kind', 'optional_toggle',
              'label', coalesce(c.value ->> 'label', ''),
              'helper', c.value ->> 'sub',
              'injected_text', coalesce(c.value ->> 'injected_text', ''),
              'suggested_selected', coalesce((c.value ->> 'default')::boolean, false),
              'enabled', true
            )) order by c.ordinality
          )
          from jsonb_array_elements(ut.checkboxes) with ordinality as c(value, ordinality)
        ), '[]'::jsonb)
    ) as document
  from public.user_templates ut
  where ut.document is null
)
update public.user_templates ut
set document = canonical.document,
    schema_version = 1
from canonical
where canonical.id = ut.id
  and octet_length(canonical.document::text) <= 50000;

insert into public.legacy_template_map (
  legacy_source_kind, legacy_source_id, canonical_template_id,
  migration_status, source_checksum, target_checksum, original_slug,
  migrated_at
)
select
  'user_template', ut.id, ut.id, 'migrated',
  md5(jsonb_build_object('base_prompt', ut.base_prompt, 'fields', ut.fields, 'checkboxes', ut.checkboxes)::text),
  md5(ut.document::text), coalesce(ut.share_slug, ut.slug), now()
from public.user_templates ut
where ut.document is not null
on conflict (legacy_source_kind, legacy_source_id) do update
set canonical_template_id = excluded.canonical_template_id,
    migration_status = excluded.migration_status,
    source_checksum = excluded.source_checksum,
    target_checksum = excluded.target_checksum,
    original_slug = excluded.original_slug,
    migrated_at = excluded.migrated_at,
    error_reason = null,
    updated_at = now();

insert into public.legacy_template_map (
  legacy_source_kind, legacy_source_id, migration_status,
  source_checksum, original_slug
)
select
  'prompt_notebook', nb.id, 'pending', md5(nb.doc::text), nb.share_slug
from public.prompt_notebooks nb
on conflict (legacy_source_kind, legacy_source_id) do nothing;

-- Existing public canonical rows receive an immutable first publication snapshot.
insert into public.template_revisions (
  template_id, owner_id, schema_version, source_edit_version, reason,
  title, outcome, category, icon, document
)
select ut.id, ut.owner_id, ut.schema_version, ut.edit_version, 'publish',
       ut.title, coalesce(ut.blurb, ''), ut.category, ut.icon, ut.document
from public.user_templates ut
where ut.visibility = 'public'
  and ut.deleted_at is null
  and ut.document is not null
  and ut.published_revision_id is null;

update public.user_templates ut
set published_revision_id = (
  select tr.id from public.template_revisions tr
  where tr.template_id = ut.id and tr.reason = 'publish'
  order by tr.created_at desc limit 1
)
where ut.visibility = 'public'
  and ut.published_revision_id is null
  and exists (select 1 from public.template_revisions tr where tr.template_id = ut.id and tr.reason = 'publish');
