-- Publication is invoked only by the server after getUser() and full document/link
-- validation. Browser roles cannot call this privileged transition directly.
drop function if exists public.publish_workflow(uuid, integer, text, boolean);

create function public.publish_workflow(p_id uuid, p_owner uuid, p_revision integer, p_share_slug text, p_publish boolean)
returns table(share_slug text, revision integer)
language plpgsql security definer set search_path = '' as $$
declare w public.user_workflows%rowtype;
begin
  if p_owner is null then raise exception 'owner required'; end if;
  select * into w from public.user_workflows where id = p_id and owner_id = p_owner for update;
  if not found then raise exception 'not found'; end if;
  if w.revision <> p_revision then raise exception 'stale revision'; end if;
  if p_publish and (
    btrim(w.title) = '' or btrim(w.blurb) = '' or btrim(w.overview) = '' or btrim(w.time_label) = '' or
    jsonb_typeof(w.document->'steps') <> 'array' or jsonb_array_length(w.document->'steps') = 0
  ) then raise exception 'workflow is incomplete'; end if;
  perform set_config('easyprompt.workflow_publish', 'allowed', true);
  update public.user_workflows
    set visibility = case when p_publish then 'public' else 'private' end,
        share_slug = case when p_publish then coalesce(w.share_slug, p_share_slug) else w.share_slug end,
        published_at = case when p_publish then coalesce(w.published_at, now()) else w.published_at end,
        revision = w.revision + 1, updated_at = now()
    where id = p_id;
  return query select uw.share_slug, uw.revision from public.user_workflows uw where uw.id = p_id;
end $$;
revoke all on function public.publish_workflow(uuid, uuid, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.publish_workflow(uuid, uuid, integer, text, boolean) to service_role;
