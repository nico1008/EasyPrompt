-- EasyPrompt — add the row id to community_prompt() so "Use as starting point"
-- can record a structured remixed_from pointer (the remixer can't read another
-- owner's saved_prompts row directly under RLS). Drop+recreate because the OUT
-- signature changes. Apply via MCP / SQL editor after 0011.

drop function if exists public.community_prompt(text);

create or replace function public.community_prompt(p_slug text)
returns table(
  id uuid, name text, body text, answers jsonb, source_kind text, catalog_slug text,
  user_template_id uuid, visibility text, author_username text, author_display_name text
)
language sql stable security definer set search_path = ''
as $$
  select sp.id, sp.name, sp.body, sp.answers, sp.source_kind, sp.catalog_slug, sp.user_template_id,
         sp.visibility::text,
         case when pr.is_public then pr.username else null end,
         case when pr.is_public then pr.display_name else null end
  from public.saved_prompts sp
  left join public.profiles pr on pr.id = sp.owner_id
  where sp.share_slug = p_slug and sp.visibility in ('published', 'unlisted')
$$;
revoke all on function public.community_prompt(text) from public;
grant execute on function public.community_prompt(text) to anon, authenticated;
