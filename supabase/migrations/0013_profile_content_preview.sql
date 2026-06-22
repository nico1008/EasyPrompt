-- EasyPrompt — add a `preview` column to public_profile_content so a public
-- profile's contribution cards can show the same blurb as the community cards
-- (one card component everywhere). Drop+recreate because the OUT signature changes.
-- Apply via MCP / SQL editor after 0012. Prompts return their body (capped) for
-- client-side blurb derivation; user_templates return their blurb; notebooks none.

drop function if exists public.public_profile_content(text);

create or replace function public.public_profile_content(p_username text)
returns table(
  object_type text, share_slug text, title text, category text, icon text,
  preview text, updated_at timestamptz, uses bigint
)
language sql stable security definer set search_path = ''
as $$
  with prof as (
    select id from public.profiles where username = p_username and is_public = true
  )
  select * from (
    select 'prompt'::text as object_type, sp.share_slug, sp.name as title, null::text as category,
           'letter'::text as icon, left(coalesce(sp.body, ''), 300) as preview, sp.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_prompt' and cs.target_key = sp.share_slug), 0)::bigint as uses
    from public.saved_prompts sp join prof on sp.owner_id = prof.id
    where sp.visibility = 'published' and sp.share_slug is not null
    union all
    select 'template'::text, ut.share_slug, ut.title, ut.category, ut.icon, ut.blurb, ut.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_template' and cs.target_key = ut.share_slug), 0)::bigint
    from public.user_templates ut join prof on ut.owner_id = prof.id
    where ut.visibility = 'published' and ut.share_slug is not null
    union all
    select 'template'::text, nb.share_slug, nb.name, null::text, 'code'::text, null::text, nb.updated_at,
           coalesce((select cs.copies + cs.opens from public.content_stats cs
                     where cs.target_kind = 'user_template' and cs.target_key = nb.share_slug), 0)::bigint
    from public.prompt_notebooks nb join prof on nb.owner_id = prof.id
    where nb.visibility = 'published' and nb.share_slug is not null
  ) t
  order by t.updated_at desc
$$;
revoke all on function public.public_profile_content(text) from public;
grant execute on function public.public_profile_content(text) to anon, authenticated;
