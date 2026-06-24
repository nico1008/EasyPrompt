-- 0014_prompt_category_and_listing.sql
-- Additive: give saved Prompts a category (required at publish time, enforced in
-- the app), and reshape the community listing RPCs so the browse grids can:
--   * carry a Prompt's category + created_at (for category filtering + true-recency sort), and
--   * ship only a short preview instead of every full body on initial load
--     (full body is fetched lazily on Copy via community_prompt()).
-- No drops of data; the RPC return shapes change, so they are dropped + recreated.

alter table public.saved_prompts
  add column if not exists category text;

-- ---- published_prompts: + preview, category, created_at (drops full body from payload) ----
drop function if exists public.published_prompts(integer, integer);

create function public.published_prompts(p_limit integer, p_offset integer)
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
         case when pr.is_public then pr.username else null end,
         case when pr.is_public then pr.display_name else null end
  from public.saved_prompts sp
  left join public.profiles pr on pr.id = sp.owner_id
  where sp.visibility = 'published' and sp.share_slug is not null
  order by sp.created_at desc
  limit greatest(coalesce(p_limit, 24), 0)
  offset greatest(coalesce(p_offset, 0), 0)
$function$;

grant execute on function public.published_prompts(integer, integer) to anon, authenticated;

-- ---- published_templates: + created_at (for true-recency sort) ----
drop function if exists public.published_templates(integer, integer, text);

create function public.published_templates(p_limit integer, p_offset integer, p_category text default null)
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
           case when pr.is_public then pr.username else null end as author_username,
           case when pr.is_public then pr.display_name else null end as author_display_name
    from public.user_templates ut
    left join public.profiles pr on pr.id = ut.owner_id
    where ut.visibility = 'published' and ut.share_slug is not null
      and (p_category is null or ut.category = p_category)
    union all
    select nb.share_slug, nb.name, null::text, 'code'::text, 'Template'::text, null::text,
           nb.created_at, nb.updated_at,
           case when pr.is_public then pr.username else null end,
           case when pr.is_public then pr.display_name else null end
    from public.prompt_notebooks nb
    left join public.profiles pr on pr.id = nb.owner_id
    where nb.visibility = 'published' and nb.share_slug is not null
      and (p_category is null)
  ) t
  order by t.created_at desc
  limit greatest(coalesce(p_limit, 24), 0)
  offset greatest(coalesce(p_offset, 0), 0)
$function$;

grant execute on function public.published_templates(integer, integer, text) to anon, authenticated;
