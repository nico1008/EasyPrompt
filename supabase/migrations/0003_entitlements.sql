-- EasyPrompt — account-bound Pro entitlements.
-- Apply via Supabase Dashboard → SQL Editor (paste + Run) or `supabase db push`.
--
-- Pro/premium was device-local (a localStorage HMAC token, no account). This
-- table lets a logged-in user's entitlement follow them across devices: when
-- they redeem a code while signed in, we persist the result here, then mint the
-- same short-lived token from this row on any device they log into. The
-- anonymous code → /api/entitlement → localStorage path is unchanged.
--
-- One active entitlement per user (owner_id unique → upsert target). A new
-- redeem upgrades/replaces. We store a *hash* of the redeemed code (audit / a
-- future redemption-cap seam), never the raw code.

create table if not exists public.entitlements (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null unique references auth.users(id) on delete cascade,
  plan       text not null check (plan in ('lifetime','pass','subscription')),
  source     text,                         -- provider name, e.g. 'telegram'
  code_hash  text,                         -- HMAC of the redeemed code (never the raw code)
  ent_exp    timestamptz,                  -- when the entitlement expires (pass); null = no expiry
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

-- Owner-only: a user can read/write only their own entitlement.
create policy "entitlements_owner_all"
  on public.entitlements for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Reuse the shared updated_at trigger function from 0001.
create trigger entitlements_set_updated_at before update on public.entitlements
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.entitlements to authenticated;
