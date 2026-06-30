-- Behavioral auth/security checks for the live Supabase project.
-- Run after applying 0017_auth_contract_hardening.sql. This script rolls back.

begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-a@example.test',
    crypt('password-a', gen_salt('bf')),
    now(),
    '{"username":"rls-a"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-0000000000b2',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-b@example.test',
    crypt('password-b', gen_salt('bf')),
    now(),
    '{"username":"rls-b"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.saved_prompts
  (id, owner_id, name, source_kind, answers, body, category, visibility, share_slug)
values
  ('10000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'Private A', 'manual', '{}'::jsonb, '# Private', 'writing', 'private', 'privatetest000000000000000000000000'),
  ('10000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'Private B', 'manual', '{}'::jsonb, '# Private B', 'writing', 'private', 'privatebtest00000000000000000000000'),
  ('10000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000a1', 'Public A', 'manual', '{}'::jsonb, '# Public', 'writing', 'public', 'publictest0000000000000000000000000');

set local role anon;

do $$
declare
  v_count integer;
begin
  begin
    select count(*) into v_count
    from public.saved_prompts
    where id = '10000000-0000-4000-8000-0000000000a1';
    raise exception 'anon direct private read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  select count(*) into v_count
  from public.community_prompt('privatetest000000000000000000000000');
  if v_count <> 0 then
    raise exception 'private content leaked through community_prompt';
  end if;

  select count(*) into v_count
  from public.community_prompt('publictest0000000000000000000000000');
  if v_count <> 1 then
    raise exception 'public content did not resolve through community_prompt';
  end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);

do $$
declare
  v_count integer;
begin
  begin
    insert into public.entitlements (owner_id, plan)
    values ('00000000-0000-4000-8000-0000000000a1', 'lifetime');
    raise exception 'authenticated direct entitlement insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.entitlements
       set plan = 'lifetime'
     where owner_id = '00000000-0000-4000-8000-0000000000a1';
    raise exception 'authenticated direct entitlement update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.entitlements
     where owner_id = '00000000-0000-4000-8000-0000000000a1';
    raise exception 'authenticated direct entitlement delete unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  update public.saved_prompts
     set name = 'Hacked'
   where id = '10000000-0000-4000-8000-0000000000b2';
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'normal user modified another user private data';
  end if;

  begin
    update public.saved_prompts
       set visibility = 'public'
     where id = '10000000-0000-4000-8000-0000000000a1';
    raise exception 'direct protected visibility update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.saved_prompts
       set share_slug = 'directsharetest00000000000000000000'
     where id = '10000000-0000-4000-8000-0000000000a1';
    raise exception 'direct protected share_slug update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'auth_contract_negative_passed' as result;
