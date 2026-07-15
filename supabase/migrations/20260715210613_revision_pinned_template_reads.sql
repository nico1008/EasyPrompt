-- Public Template metadata must come from the immutable published revision on
-- cards, profiles, and detail fallbacks. Editable columns stay owner-private.
create or replace function public.published_templates(p_limit integer, p_offset integer, p_category text default null)
returns table(
  share_slug text, title text, category text, icon text, tag text, blurb text,
  created_at timestamptz, updated_at timestamptz,
  author_username text, author_display_name text
)
language sql stable security definer set search_path = ''
as $function$
  select * from (
    select ut.share_slug, tr.title, tr.category, tr.icon, ut.tag, tr.outcome,
           ut.created_at as created_at, tr.created_at as updated_at,
           pr.username,
           case when pr.username is not null then pr.display_name else null end
    from public.user_templates ut
    join public.template_revisions tr on tr.id = ut.published_revision_id
    left join public.profiles pr on pr.id = ut.owner_id
    where ut.visibility = 'public' and ut.share_slug is not null and ut.deleted_at is null
      and (p_category is null or tr.category = p_category)
    union all
    select nb.share_slug, nb.name, null::text, 'code'::text, 'Template'::text, null::text,
           nb.created_at, nb.updated_at,
           pr.username,
           case when pr.username is not null then pr.display_name else null end
    from public.prompt_notebooks nb
    left join public.profiles pr on pr.id = nb.owner_id
    where nb.visibility = 'public' and nb.share_slug is not null and nb.deleted_at is null
      and p_category is null
  ) t
  order by t.updated_at desc
  limit greatest(coalesce(p_limit, 24), 0)
  offset greatest(coalesce(p_offset, 0), 0)
$function$;

create or replace function public.community_template(p_slug text)
returns table(
  kind text, title text, payload jsonb, visibility text,
  author_username text, author_display_name text
)
language sql stable security definer set search_path = ''
as $$
  select 'notebook'::text, nb.name, jsonb_build_object('doc', nb.doc), nb.visibility::text,
         pr.username,
         case when pr.username is not null then pr.display_name else null end
  from public.prompt_notebooks nb
  left join public.profiles pr on pr.id = nb.owner_id
  where nb.share_slug = p_slug and nb.visibility = 'public' and nb.deleted_at is null
  union all
  select 'user_template'::text, ut.title,
         jsonb_build_object(
           'category', ut.category, 'icon', ut.icon, 'tag', ut.tag, 'blurb', ut.blurb,
           'intro', ut.intro, 'base_prompt', ut.base_prompt,
           'fields', ut.fields, 'checkboxes', ut.checkboxes),
         ut.visibility::text,
         pr.username,
         case when pr.username is not null then pr.display_name else null end
  from public.user_templates ut
  left join public.profiles pr on pr.id = ut.owner_id
  where ut.share_slug = p_slug and ut.visibility = 'public' and ut.deleted_at is null
    and ut.published_revision_id is null
  limit 1
$$;

create or replace function public.public_profile_content(p_username text)
returns table(
  object_type text, share_slug text, title text, category text, icon text,
  preview text, updated_at timestamptz, uses bigint
)
language sql stable security definer set search_path = ''
as $$
  with prof as (select id from public.profiles where username = lower(p_username))
  select * from (
    select 'prompt'::text, sp.share_slug, sp.name, null::text, 'letter'::text,
           left(coalesce(sp.body, ''), 300), sp.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_prompt' and cs.target_key = sp.share_slug), 0)::bigint
    from public.saved_prompts sp join prof on sp.owner_id = prof.id
    where sp.visibility = 'public' and sp.share_slug is not null
    union all
    select 'template'::text, ut.share_slug, tr.title, tr.category, tr.icon, tr.outcome, tr.created_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_template' and cs.target_key = ut.share_slug), 0)::bigint
    from public.user_templates ut
    join public.template_revisions tr on tr.id = ut.published_revision_id
    join prof on ut.owner_id = prof.id
    where ut.visibility = 'public' and ut.share_slug is not null and ut.deleted_at is null
    union all
    select 'template'::text, nb.share_slug, nb.name, null::text, 'code'::text, null::text, nb.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_template' and cs.target_key = nb.share_slug), 0)::bigint
    from public.prompt_notebooks nb join prof on nb.owner_id = prof.id
    where nb.visibility = 'public' and nb.share_slug is not null and nb.deleted_at is null
  ) t
  order by t.updated_at desc
$$;

revoke all on function public.published_templates(integer, integer, text) from public;
revoke all on function public.community_template(text) from public;
revoke all on function public.public_profile_content(text) from public;
grant execute on function public.published_templates(integer, integer, text) to anon, authenticated;
grant execute on function public.community_template(text) to anon, authenticated;
grant execute on function public.public_profile_content(text) to anon, authenticated;
