-- EasyPrompt - Supabase auth contract hardening.
--
-- Goals:
-- - Pro entitlements are server-controlled: authenticated users can read their
--   own entitlement through RLS, but cannot insert/update/delete entitlement rows
--   through the anon key or Data API.
-- - Protected publishing fields (visibility/share_slug) are not directly
--   writable through table grants. The only write path is the narrow
--   set_content_visibility RPC below.
-- - Anon has no direct table grants. Public reads remain RPC-only.

-- Revoke broad platform/default grants first, then re-grant only what the app
-- needs. RLS remains the row-level authorization boundary for owner data.
revoke all privileges on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Profiles: app updates profile fields only; profile rows are inserted by the
-- auth trigger. RLS restricts select/update to auth.uid() = id.
grant select on public.profiles to authenticated;
grant update (username, display_name, bio) on public.profiles to authenticated;

-- User Templates. Protected columns visibility/share_slug are intentionally not
-- granted for insert/update; publishing goes through set_content_visibility().
grant select, delete on public.user_templates to authenticated;
grant insert (
  owner_id, slug, title, category, icon, tag, blurb, intro, base_prompt,
  fields, checkboxes, is_public
) on public.user_templates to authenticated;
grant update (
  slug, title, category, icon, tag, blurb, intro, base_prompt, fields,
  checkboxes, is_public
) on public.user_templates to authenticated;

-- Saved Prompts. Protected columns visibility/share_slug are intentionally not
-- granted for insert/update; publishing goes through set_content_visibility().
grant select, delete on public.saved_prompts to authenticated;
grant insert (
  owner_id, name, source_kind, catalog_slug, user_template_id, answers, body,
  category, remixed_from
) on public.saved_prompts to authenticated;
grant update (
  name, answers, body, category, remixed_from
) on public.saved_prompts to authenticated;

-- Account-bound Pro entitlements are not user-writable. The server validates a
-- signed code, resolves getUser(), then writes with the server-only service role.
grant select on public.entitlements to authenticated;

-- Ratings/bookmarks remain owner-scoped through RLS. Grant only the operations
-- the app uses.
grant select, delete on public.prompt_ratings to authenticated;
grant insert (owner_id, target_kind, target_key, rating) on public.prompt_ratings to authenticated;
grant update (rating) on public.prompt_ratings to authenticated;

grant select, delete on public.bookmarks to authenticated;
grant insert (owner_id, target_kind, target_key) on public.bookmarks to authenticated;

-- Block-built Templates and their versions. Protected columns visibility and
-- share_slug are intentionally not granted for direct writes.
grant select, delete on public.prompt_notebooks to authenticated;
grant insert (owner_id, name, doc) on public.prompt_notebooks to authenticated;
grant update (name, doc) on public.prompt_notebooks to authenticated;

grant select, delete on public.prompt_notebook_versions to authenticated;
grant insert (notebook_id, owner_id, name, doc) on public.prompt_notebook_versions to authenticated;
grant update (name, doc) on public.prompt_notebook_versions to authenticated;

-- Metrics tables keep RLS enabled and no direct grants. They are only accessed
-- by record_interaction/content_stats_* SECURITY DEFINER RPCs.

-- Internal trigger helper should not be a public RPC surface.
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create or replace function public.set_content_visibility(
  p_target_kind text,
  p_target_id uuid,
  p_visibility public.content_visibility,
  p_share_slug text default null
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_supplied_slug text := nullif(trim(coalesce(p_share_slug, '')), '');
  v_share_slug text;
  v_count integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_target_kind not in ('notebook', 'user_template', 'saved_prompt') then
    raise exception 'invalid target kind' using errcode = '22023';
  end if;

  if p_visibility not in ('private'::public.content_visibility, 'public'::public.content_visibility) then
    raise exception 'invalid visibility' using errcode = '22023';
  end if;

  if v_supplied_slug is not null and v_supplied_slug !~ '^[a-z0-9]{8,64}$' then
    raise exception 'invalid share slug' using errcode = '22023';
  end if;

  if p_target_kind = 'notebook' then
    update public.prompt_notebooks
       set visibility = p_visibility,
           share_slug = case
             when p_visibility = 'public'::public.content_visibility
               then coalesce(public.prompt_notebooks.share_slug, v_supplied_slug)
             else public.prompt_notebooks.share_slug
           end,
           updated_at = now()
     where id = p_target_id
       and owner_id = v_user
     returning public.prompt_notebooks.share_slug into v_share_slug;
  elsif p_target_kind = 'user_template' then
    update public.user_templates
       set visibility = p_visibility,
           share_slug = case
             when p_visibility = 'public'::public.content_visibility
               then coalesce(public.user_templates.share_slug, v_supplied_slug)
             else public.user_templates.share_slug
           end,
           updated_at = now()
     where id = p_target_id
       and owner_id = v_user
     returning public.user_templates.share_slug into v_share_slug;
  else
    update public.saved_prompts
       set visibility = p_visibility,
           share_slug = case
             when p_visibility = 'public'::public.content_visibility
               then coalesce(public.saved_prompts.share_slug, v_supplied_slug)
             else public.saved_prompts.share_slug
           end,
           updated_at = now()
     where id = p_target_id
       and owner_id = v_user
     returning public.saved_prompts.share_slug into v_share_slug;
  end if;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  if p_visibility = 'public'::public.content_visibility and v_share_slug is null then
    raise exception 'share slug required' using errcode = '22023';
  end if;

  return v_share_slug;
end;
$$;

revoke all on function public.set_content_visibility(text, uuid, public.content_visibility, text)
  from public, anon;
grant execute on function public.set_content_visibility(text, uuid, public.content_visibility, text)
  to authenticated;
