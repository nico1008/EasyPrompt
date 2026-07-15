-- Exact-slug lifecycle status for middleware. Only deleted/tombstoned routes
-- are disclosed; private and unknown Templates remain indistinguishable.
create or replace function public.template_route_status(p_slug text)
returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.user_templates
      where share_slug = p_slug and deleted_at is not null
    ) or exists (
      select 1 from public.prompt_notebooks
      where share_slug = p_slug and deleted_at is not null
    ) or exists (
      select 1 from public.template_route_redirects
      where legacy_path = '/p/' || p_slug and status_code = 410
    ) then 'deleted'
    else 'unavailable'
  end
$$;

revoke all on function public.template_route_status(text) from public;
grant execute on function public.template_route_status(text) to anon, authenticated;
