-- EasyPrompt — Phase 2/3: community discovery + public profiles (security-definer RPCs).
-- Apply via Supabase Dashboard → SQL Editor or `supabase db push`, AFTER 0010 and
-- BEFORE deploying matching code. Run once.
--
-- All functions: security definer, search_path='', revoked from public, granted to
-- anon + authenticated — the codebase convention (same as shared_*/rating_aggregate).
-- RLS stays owner-only; these are the ONLY public read paths. Author identity
-- (username/display_name) is exposed ONLY when the author's profile is_public = true,
-- so non-opted-in authors get no public link even though their content is published.
-- Reputation is computed on-read (no scheduler exists): a per-item-capped sum of
-- distinct anonymized actors over 90 days. (Not true user-level self-exclusion —
-- events are anonymized; the per-item cap bounds self-inflation.)

-- ============================================================================
-- Listing: published Prompts + Templates (newest first, paginated).
-- ============================================================================
create or replace function public.published_prompts(p_limit int, p_offset int)
returns table(
  share_slug text, name text, body text, updated_at timestamptz,
  author_username text, author_display_name text
)
language sql stable security definer set search_path = ''
as $$
  select sp.share_slug, sp.name, sp.body, sp.updated_at,
         case when pr.is_public then pr.username else null end,
         case when pr.is_public then pr.display_name else null end
  from public.saved_prompts sp
  left join public.profiles pr on pr.id = sp.owner_id
  where sp.visibility = 'published' and sp.share_slug is not null
  order by sp.updated_at desc
  limit greatest(coalesce(p_limit, 24), 0)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
revoke all on function public.published_prompts(int, int) from public;
grant execute on function public.published_prompts(int, int) to anon, authenticated;

create or replace function public.published_templates(p_limit int, p_offset int, p_category text default null)
returns table(
  share_slug text, title text, category text, icon text, tag text, blurb text, updated_at timestamptz,
  author_username text, author_display_name text
)
language sql stable security definer set search_path = ''
as $$
  select * from (
    select ut.share_slug, ut.title, ut.category, ut.icon, ut.tag, ut.blurb, ut.updated_at,
           case when pr.is_public then pr.username else null end as author_username,
           case when pr.is_public then pr.display_name else null end as author_display_name
    from public.user_templates ut
    left join public.profiles pr on pr.id = ut.owner_id
    where ut.visibility = 'published' and ut.share_slug is not null
      and (p_category is null or ut.category = p_category)
    union all
    select nb.share_slug, nb.name, null::text, 'code'::text, 'Template'::text, null::text, nb.updated_at,
           case when pr.is_public then pr.username else null end,
           case when pr.is_public then pr.display_name else null end
    from public.prompt_notebooks nb
    left join public.profiles pr on pr.id = nb.owner_id
    where nb.visibility = 'published' and nb.share_slug is not null
      and (p_category is null)
  ) t
  order by t.updated_at desc
  limit greatest(coalesce(p_limit, 24), 0)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
revoke all on function public.published_templates(int, int, text) from public;
grant execute on function public.published_templates(int, int, text) to anon, authenticated;

-- ============================================================================
-- Community detail: render payload + visibility (index vs noindex) + author.
-- ============================================================================
create or replace function public.community_prompt(p_slug text)
returns table(
  name text, body text, answers jsonb, source_kind text, catalog_slug text, user_template_id uuid,
  visibility text, author_username text, author_display_name text
)
language sql stable security definer set search_path = ''
as $$
  select sp.name, sp.body, sp.answers, sp.source_kind, sp.catalog_slug, sp.user_template_id,
         sp.visibility::text,
         case when pr.is_public then pr.username else null end,
         case when pr.is_public then pr.display_name else null end
  from public.saved_prompts sp
  left join public.profiles pr on pr.id = sp.owner_id
  where sp.share_slug = p_slug and sp.visibility in ('published', 'unlisted')
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
         case when pr.is_public then pr.username else null end,
         case when pr.is_public then pr.display_name else null end
  from public.prompt_notebooks nb
  left join public.profiles pr on pr.id = nb.owner_id
  where nb.share_slug = p_slug and nb.visibility in ('published', 'unlisted')
  union all
  select 'user_template'::text, ut.title,
         jsonb_build_object(
           'category', ut.category, 'icon', ut.icon, 'tag', ut.tag, 'blurb', ut.blurb,
           'intro', ut.intro, 'base_prompt', ut.base_prompt,
           'fields', ut.fields, 'checkboxes', ut.checkboxes),
         ut.visibility::text,
         case when pr.is_public then pr.username else null end,
         case when pr.is_public then pr.display_name else null end
  from public.user_templates ut
  left join public.profiles pr on pr.id = ut.owner_id
  where ut.share_slug = p_slug and ut.visibility in ('published', 'unlisted')
  limit 1
$$;
revoke all on function public.community_template(text) from public;
grant execute on function public.community_template(text) to anon, authenticated;

-- ============================================================================
-- Public profile (opt-in) + its published content. reputation computed on-read.
-- ============================================================================
create or replace function public.public_profile(p_username text)
returns table(
  id uuid, username text, display_name text, bio text, created_at timestamptz, reputation int
)
language sql stable security definer set search_path = ''
as $$
  with prof as (
    select p.id, p.username, p.display_name, p.bio, p.created_at
    from public.profiles p
    where p.username = p_username and p.is_public = true
  ),
  items as (
    select 'user_prompt'::text as kind, sp.share_slug as key
    from public.saved_prompts sp join prof on sp.owner_id = prof.id
    where sp.visibility = 'published' and sp.share_slug is not null
    union all
    select 'user_template'::text, ut.share_slug
    from public.user_templates ut join prof on ut.owner_id = prof.id
    where ut.visibility = 'published' and ut.share_slug is not null
    union all
    select 'user_template'::text, nb.share_slug
    from public.prompt_notebooks nb join prof on nb.owner_id = prof.id
    where nb.visibility = 'published' and nb.share_slug is not null
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
  updated_at timestamptz, uses bigint
)
language sql stable security definer set search_path = ''
as $$
  with prof as (
    select id from public.profiles where username = p_username and is_public = true
  )
  select * from (
    select 'prompt'::text as object_type, sp.share_slug, sp.name as title, null::text as category,
           'letter'::text as icon, sp.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_prompt' and cs.target_key = sp.share_slug), 0)::bigint as uses
    from public.saved_prompts sp join prof on sp.owner_id = prof.id
    where sp.visibility = 'published' and sp.share_slug is not null
    union all
    select 'template'::text, ut.share_slug, ut.title, ut.category, ut.icon, ut.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_template' and cs.target_key = ut.share_slug), 0)::bigint
    from public.user_templates ut join prof on ut.owner_id = prof.id
    where ut.visibility = 'published' and ut.share_slug is not null
    union all
    select 'template'::text, nb.share_slug, nb.name, null::text, 'code'::text, nb.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_template' and cs.target_key = nb.share_slug), 0)::bigint
    from public.prompt_notebooks nb join prof on nb.owner_id = prof.id
    where nb.visibility = 'published' and nb.share_slug is not null
  ) t
  order by t.updated_at desc
$$;
revoke all on function public.public_profile_content(text) from public;
grant execute on function public.public_profile_content(text) to anon, authenticated;
