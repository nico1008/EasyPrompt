-- Project default privileges grant function execution to anon. Publishing is an
-- authenticated owner mutation and must never be callable by anon.
revoke execute on function public.publish_workflow(uuid, integer, text, boolean) from anon;
