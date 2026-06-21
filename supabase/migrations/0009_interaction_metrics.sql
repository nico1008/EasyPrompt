-- EasyPrompt — usage metrics ("Uses"): copy / open-in / view tracking for the
-- public catalog + curated example prompts (audit Phase 1).
-- Apply via Supabase Dashboard → SQL Editor (paste + Run) or `supabase db push`,
-- BEFORE deploying the matching code. Run once.
--
-- ADDITIVE ONLY. Two tables + three RPCs, all RLS-first. Both tables have RLS
-- ENABLED with NO policies and ZERO grants to anon/authenticated — the only access
-- path is the security-definer RPCs below (same containment as rating_aggregate()
-- in 0005). Writes go through record_interaction(); reads through
-- content_stats_get() / content_stats_batch().
--
-- "Uses" = copies + open-ins. Views are a denominator only (copy-through rate).
-- Dedup is atomic via a unique index on a per-action time bucket; the counter is
-- an atomic increment (col = col + excluded.col) so it stays correct under
-- concurrency. actor_hash / ip_hash are salted hashes computed server-side in
-- /api/track — no raw PII ever reaches the DB.

-- ============================================================================
-- interaction_events  (append-only log; powers dedup + future trending)
-- ============================================================================
create table if not exists public.interaction_events (
  id          uuid primary key default gen_random_uuid(),
  target_kind text not null,
  target_key  text not null,
  action      text not null
              check (action in ('copy','open_chatgpt','open_claude','open_gemini','view')),
  actor_hash  text not null,
  ip_hash     text,
  bucket      timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Atomic dedup: one counted event per (actor, target, action) per time bucket.
create unique index if not exists interaction_events_dedup_idx
  on public.interaction_events (actor_hash, target_kind, target_key, action, bucket);

create index if not exists interaction_events_target_idx
  on public.interaction_events (target_kind, target_key, created_at desc);
create index if not exists interaction_events_action_idx
  on public.interaction_events (action, created_at desc);

alter table public.interaction_events enable row level security;
-- No policies, no grants: only the security-definer RPCs touch this table.

-- ============================================================================
-- content_stats  (denormalized counters for O(1) card reads)
-- ============================================================================
create table if not exists public.content_stats (
  target_kind text not null,
  target_key  text not null,
  copies      bigint not null default 0,
  opens       bigint not null default 0,
  views       bigint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (target_kind, target_key)
);

alter table public.content_stats enable row level security;
-- No policies, no grants: reads go through the security-definer RPCs below.

-- ============================================================================
-- record_interaction — dedup + atomic increment in a SINGLE statement.
-- ============================================================================
create or replace function public.record_interaction(
  p_kind text,
  p_key text,
  p_action text,
  p_actor_hash text,
  p_ip_hash text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz;
begin
  -- Defense in depth (the table also checks action).
  if p_action not in ('copy','open_chatgpt','open_claude','open_gemini','view') then
    return;
  end if;
  if coalesce(length(p_actor_hash), 0) = 0
     or coalesce(length(p_key), 0) = 0
     or coalesce(length(p_kind), 0) = 0 then
    return;
  end if;

  -- Dedup window: views once per day; uses (copy/open) per 30-minute slot.
  v_bucket := case
    when p_action = 'view' then date_trunc('day', now())
    else to_timestamp(floor(extract(epoch from now()) / 1800) * 1800)
  end;

  with ins as (
    insert into public.interaction_events
      (target_kind, target_key, action, actor_hash, ip_hash, bucket)
    values (p_kind, p_key, p_action, p_actor_hash, p_ip_hash, v_bucket)
    on conflict (actor_hash, target_kind, target_key, action, bucket) do nothing
    returning 1
  )
  insert into public.content_stats (target_kind, target_key, copies, opens, views, updated_at)
  select p_kind, p_key,
         (p_action = 'copy')::int,
         (p_action in ('open_chatgpt','open_claude','open_gemini'))::int,
         (p_action = 'view')::int,
         now()
  from ins
  on conflict (target_kind, target_key) do update
    set copies     = public.content_stats.copies + excluded.copies,
        opens      = public.content_stats.opens  + excluded.opens,
        views      = public.content_stats.views  + excluded.views,
        updated_at = now();
end;
$$;

revoke all on function public.record_interaction(text, text, text, text, text) from public;
grant execute on function public.record_interaction(text, text, text, text, text) to anon, authenticated;

-- ============================================================================
-- content_stats_get / content_stats_batch — aggregate reads (uses = copies+opens)
-- ============================================================================
create or replace function public.content_stats_get(p_kind text, p_key text)
returns table(uses bigint, views bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select (copies + opens)::bigint, views::bigint
  from public.content_stats
  where target_kind = p_kind and target_key = p_key
$$;

revoke all on function public.content_stats_get(text, text) from public;
grant execute on function public.content_stats_get(text, text) to anon, authenticated;

create or replace function public.content_stats_batch(p_kind text, p_keys text[])
returns table(target_key text, uses bigint, views bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select cs.target_key, (cs.copies + cs.opens)::bigint, cs.views::bigint
  from public.content_stats cs
  where cs.target_kind = p_kind and cs.target_key = any(p_keys)
$$;

revoke all on function public.content_stats_batch(text, text[]) from public;
grant execute on function public.content_stats_batch(text, text[]) to anon, authenticated;
