-- EasyPrompt - private/public visibility.
-- Replaces draft/published/unlisted with GitHub-style private/public.
-- Existing published rows become public. Existing draft and unlisted rows become
-- private. share_slug values are preserved but private rows no longer resolve
-- through public RPCs.

drop function if exists public.shared_template(text);
drop function if exists public.shared_prompt(text);
drop function if exists public.shared_notebook(text);
drop function if exists public.community_prompt(text);
drop function if exists public.community_template(text);
drop function if exists public.public_profile(text);
drop function if exists public.public_profile_content(text);
drop function if exists public.published_prompts(integer, integer);
drop function if exists public.published_templates(integer, integer, text);

alter table public.user_templates alter column visibility drop default;
alter table public.prompt_notebooks alter column visibility drop default;
alter table public.saved_prompts alter column visibility drop default;

alter type public.content_visibility rename to content_visibility_old;
create type public.content_visibility as enum ('private', 'public');

alter table public.user_templates
  alter column visibility type public.content_visibility
  using (
    case when visibility::text = 'published' then 'public' else 'private' end
  )::public.content_visibility;

alter table public.prompt_notebooks
  alter column visibility type public.content_visibility
  using (
    case when visibility::text = 'published' then 'public' else 'private' end
  )::public.content_visibility;

alter table public.saved_prompts
  alter column visibility type public.content_visibility
  using (
    case when visibility::text = 'published' then 'public' else 'private' end
  )::public.content_visibility;

alter table public.user_templates alter column visibility set default 'private';
alter table public.prompt_notebooks alter column visibility set default 'private';
alter table public.saved_prompts alter column visibility set default 'private';

drop type public.content_visibility_old;

create or replace function public.shared_template(p_slug text)
returns table(kind text, title text, payload jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select 'notebook'::text, name, jsonb_build_object('doc', doc)
  from public.prompt_notebooks
  where share_slug = p_slug and visibility = 'public'
  union all
  select 'user_template'::text, title,
         jsonb_build_object(
           'category', category, 'icon', icon, 'tag', tag, 'blurb', blurb,
           'intro', intro, 'base_prompt', base_prompt,
           'fields', fields, 'checkboxes', checkboxes)
  from public.user_templates
  where share_slug = p_slug and visibility = 'public'
  limit 1
$$;
revoke all on function public.shared_template(text) from public;
grant execute on function public.shared_template(text) to anon, authenticated;

create or replace function public.shared_prompt(p_slug text)
returns table(
  name text, body text, answers jsonb,
  source_kind text, catalog_slug text, user_template_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select name, body, answers, source_kind, catalog_slug, user_template_id
  from public.saved_prompts
  where share_slug = p_slug and visibility = 'public'
$$;
revoke all on function public.shared_prompt(text) from public;
grant execute on function public.shared_prompt(text) to anon, authenticated;

create or replace function public.shared_notebook(p_slug text)
returns table(name text, doc jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select name, doc
  from public.prompt_notebooks
  where share_slug = p_slug and visibility = 'public'
$$;
revoke all on function public.shared_notebook(text) from public;
grant execute on function public.shared_notebook(text) to anon, authenticated;

-- Listing RPC names are kept for app compatibility. They now list public rows.
create or replace function public.published_prompts(p_limit integer, p_offset integer)
returns table(
  share_slug text,
  name text,
  preview text,
  category text,
  created_at timestamptz,
  updated_at timestamptz,
  author_username text,
  author_display_name text
)
language sql
stable
security definer
set search_path to ''
as $function$
  select sp.share_slug, sp.name,
         left(sp.body, 300) as preview,
         sp.category,
         sp.created_at, sp.updated_at,
         pr.username,
         case when pr.username is not null then pr.display_name else null end
  from public.saved_prompts sp
  left join public.profiles pr on pr.id = sp.owner_id
  where sp.visibility = 'public' and sp.share_slug is not null
  order by sp.created_at desc
  limit greatest(coalesce(p_limit, 24), 0)
  offset greatest(coalesce(p_offset, 0), 0)
$function$;
revoke all on function public.published_prompts(integer, integer) from public;
grant execute on function public.published_prompts(integer, integer) to anon, authenticated;

create or replace function public.published_templates(p_limit integer, p_offset integer, p_category text default null)
returns table(
  share_slug text,
  title text,
  category text,
  icon text,
  tag text,
  blurb text,
  created_at timestamptz,
  updated_at timestamptz,
  author_username text,
  author_display_name text
)
language sql
stable
security definer
set search_path to ''
as $function$
  select * from (
    select ut.share_slug, ut.title, ut.category, ut.icon, ut.tag, ut.blurb,
           ut.created_at, ut.updated_at,
           pr.username as author_username,
           case when pr.username is not null then pr.display_name else null end as author_display_name
    from public.user_templates ut
    left join public.profiles pr on pr.id = ut.owner_id
    where ut.visibility = 'public' and ut.share_slug is not null
      and (p_category is null or ut.category = p_category)
    union all
    select nb.share_slug, nb.name, null::text, 'code'::text, 'Template'::text, null::text,
           nb.created_at, nb.updated_at,
           pr.username,
           case when pr.username is not null then pr.display_name else null end
    from public.prompt_notebooks nb
    left join public.profiles pr on pr.id = nb.owner_id
    where nb.visibility = 'public' and nb.share_slug is not null
      and (p_category is null)
  ) t
  order by t.created_at desc
  limit greatest(coalesce(p_limit, 24), 0)
  offset greatest(coalesce(p_offset, 0), 0)
$function$;
revoke all on function public.published_templates(integer, integer, text) from public;
grant execute on function public.published_templates(integer, integer, text) to anon, authenticated;

create or replace function public.community_prompt(p_slug text)
returns table(
  id uuid, name text, body text, answers jsonb, source_kind text, catalog_slug text, user_template_id uuid,
  visibility text, author_username text, author_display_name text
)
language sql stable security definer set search_path = ''
as $$
  select sp.id, sp.name, sp.body, sp.answers, sp.source_kind, sp.catalog_slug, sp.user_template_id,
         sp.visibility::text,
         pr.username,
         case when pr.username is not null then pr.display_name else null end
  from public.saved_prompts sp
  left join public.profiles pr on pr.id = sp.owner_id
  where sp.share_slug = p_slug and sp.visibility = 'public'
$$;
revoke all on function public.community_prompt(text) from public;
grant execute on function public.community_prompt(text) to anon, authenticated;

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
  where nb.share_slug = p_slug and nb.visibility = 'public'
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
  where ut.share_slug = p_slug and ut.visibility = 'public'
  limit 1
$$;
revoke all on function public.community_template(text) from public;
grant execute on function public.community_template(text) to anon, authenticated;

create or replace function public.public_profile(p_username text)
returns table(
  id uuid, username text, display_name text, bio text, created_at timestamptz, reputation int
)
language sql stable security definer set search_path = ''
as $$
  with prof as (
    select p.id, p.username, p.display_name, p.bio, p.created_at
    from public.profiles p
    where p.username = lower(p_username)
  ),
  items as (
    select 'user_prompt'::text as kind, sp.share_slug as key
    from public.saved_prompts sp join prof on sp.owner_id = prof.id
    where sp.visibility = 'public' and sp.share_slug is not null
    union all
    select 'user_template'::text, ut.share_slug
    from public.user_templates ut join prof on ut.owner_id = prof.id
    where ut.visibility = 'public' and ut.share_slug is not null
    union all
    select 'user_template'::text, nb.share_slug
    from public.prompt_notebooks nb join prof on nb.owner_id = prof.id
    where nb.visibility = 'public' and nb.share_slug is not null
  ),
  per_item as (
    select least(count(distinct ie.actor_hash), 50) as capped
    from items
    join public.interaction_events ie
      on ie.target_kind = items.kind and ie.target_key = items.key
      and ie.action in ('copy', 'open_chatgpt', 'open_claude', 'open_gemini')
      and ie.created_at > now() - interval '90 days'
    group by items.kind, items.key
  )
  select prof.id, prof.username, prof.display_name, prof.bio, prof.created_at,
         coalesce((select sum(capped) from per_item), 0)::int
  from prof
$$;
revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;

create or replace function public.public_profile_content(p_username text)
returns table(
  object_type text, share_slug text, title text, category text, icon text,
  preview text, updated_at timestamptz, uses bigint
)
language sql stable security definer set search_path = ''
as $$
  with prof as (
    select id from public.profiles where username = lower(p_username)
  )
  select * from (
    select 'prompt'::text as object_type, sp.share_slug, sp.name as title, null::text as category,
           'letter'::text as icon, left(coalesce(sp.body, ''), 300) as preview, sp.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_prompt' and cs.target_key = sp.share_slug), 0)::bigint as uses
    from public.saved_prompts sp join prof on sp.owner_id = prof.id
    where sp.visibility = 'public' and sp.share_slug is not null
    union all
    select 'template'::text, ut.share_slug, ut.title, ut.category, ut.icon, ut.blurb, ut.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_template' and cs.target_key = ut.share_slug), 0)::bigint
    from public.user_templates ut join prof on ut.owner_id = prof.id
    where ut.visibility = 'public' and ut.share_slug is not null
    union all
    select 'template'::text, nb.share_slug, nb.name, null::text, 'code'::text, null::text, nb.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_template' and cs.target_key = nb.share_slug), 0)::bigint
    from public.prompt_notebooks nb join prof on nb.owner_id = prof.id
    where nb.visibility = 'public' and nb.share_slug is not null
  ) t
  order by t.updated_at desc
$$;
revoke all on function public.public_profile_content(text) from public;
grant execute on function public.public_profile_content(text) to anon, authenticated;
