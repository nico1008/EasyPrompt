-- EasyPrompt — content model: unified Templates + Prompts (visibility & sharing).
-- Apply via Supabase Dashboard → SQL Editor (paste + Run) or `supabase db push`.
-- Apply AFTER 0006 and BEFORE deploying the matching code. Run once.
--
-- ADDITIVE ONLY — no DROP COLUMN. Additive migrations are rollback-safe; column
-- drops are not. A later 0008 removes the deprecated user_templates.is_public
-- once 0007 is proven in production (the app mirrors is_public ↔ visibility until
-- then, so a code rollback keeps working).
--
-- Introduces ONE shared visibility/sharing model across the three owner-scoped
-- content tables (user_templates, prompt_notebooks = Templates; saved_prompts =
-- Prompts):
--   visibility ∈ ('draft','published','unlisted')   default 'draft'
--   share_slug : minted lazily on first Share/Publish; PERSISTS across changes.
-- Public reads stay capability-based: RLS remains owner-only, anon keeps ZERO
-- table grants, and the only public path is the security-definer shared_* RPCs —
-- each returns one row for an EXACT slug AND only when visibility is
-- published/unlisted, so a draft with a retained slug is dormant, never leaking.
-- (Same pattern as shared_notebook() in 0006 / rating_aggregate() in 0005.)

-- ============================================================================
-- visibility enum
-- ============================================================================
do $$ begin
  create type public.content_visibility as enum ('draft', 'published', 'unlisted');
exception
  when duplicate_object then null;
end $$;

-- ============================================================================
-- user_templates: + visibility (is_public kept & backfilled; dropped in 0008)
-- ============================================================================
alter table public.user_templates
  add column if not exists visibility public.content_visibility not null default 'draft';
alter table public.user_templates
  add column if not exists share_slug text unique;

-- Backfill: a publicly-readable template → published, else draft.
update public.user_templates
  set visibility = case when is_public then 'published'::public.content_visibility
                        else 'draft'::public.content_visibility end;

create index if not exists user_templates_visibility_idx
  on public.user_templates (visibility, updated_at desc);

-- ============================================================================
-- prompt_notebooks: + visibility (share_slug already added in 0006)
-- ============================================================================
alter table public.prompt_notebooks
  add column if not exists visibility public.content_visibility not null default 'draft';

-- Backfill: notebooks have NO catalog-publish path today — the only public path
-- is the share_slug link — so a slug ⇒ unlisted, else draft. None auto-publish.
update public.prompt_notebooks
  set visibility = case when share_slug is not null then 'unlisted'::public.content_visibility
                        else 'draft'::public.content_visibility end;

create index if not exists prompt_notebooks_visibility_idx
  on public.prompt_notebooks (visibility, updated_at desc);

-- ============================================================================
-- saved_prompts: + visibility, share_slug, body; relax the source constraint so
-- standalone Prompts (import/manual/ai, no template) are allowed.
-- ============================================================================
alter table public.saved_prompts
  add column if not exists visibility public.content_visibility not null default 'draft';
alter table public.saved_prompts
  add column if not exists share_slug text unique;
-- Stored prompt text for standalone Prompts (those with no source template to
-- recompute from). From-template Prompts leave this null and render from answers.
alter table public.saved_prompts
  add column if not exists body text;

-- Existing rows were always private.
update public.saved_prompts set visibility = 'draft' where visibility is null;

create index if not exists saved_prompts_visibility_idx
  on public.saved_prompts (visibility, updated_at desc);

-- Relax source_kind domain (was check (source_kind in ('catalog','user'))) and the
-- composition constraint to allow the non-template origins with null refs.
alter table public.saved_prompts drop constraint if exists saved_prompts_source_kind_check;
alter table public.saved_prompts
  add constraint saved_prompts_source_kind_chk
  check (source_kind in ('catalog', 'user', 'import', 'manual', 'ai'));

alter table public.saved_prompts drop constraint if exists saved_prompts_source_chk;
alter table public.saved_prompts
  add constraint saved_prompts_source_chk check (
    (source_kind = 'catalog' and catalog_slug is not null and user_template_id is null)
    or (source_kind = 'user' and user_template_id is not null and catalog_slug is null)
    or (source_kind in ('import', 'manual', 'ai') and catalog_slug is null and user_template_id is null)
  );

-- ============================================================================
-- public read RPCs — security definer, exact-slug, visibility-gated.
-- ============================================================================

-- Templates span two internal tables (block-built notebooks + form user_templates).
-- One RPC unions them and returns a discriminated payload so the share route can
-- render either without a second round-trip.
create or replace function public.shared_template(p_slug text)
returns table(kind text, title text, payload jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select 'notebook'::text, name, jsonb_build_object('doc', doc)
  from public.prompt_notebooks
  where share_slug = p_slug and visibility in ('published', 'unlisted')
  union all
  select 'user_template'::text, title,
         jsonb_build_object(
           'category', category, 'icon', icon, 'tag', tag, 'blurb', blurb,
           'intro', intro, 'base_prompt', base_prompt,
           'fields', fields, 'checkboxes', checkboxes)
  from public.user_templates
  where share_slug = p_slug and visibility in ('published', 'unlisted')
  limit 1
$$;

revoke all on function public.shared_template(text) from public;
grant execute on function public.shared_template(text) to anon, authenticated;

-- Prompts (saved_prompts). Returns enough to render a from-template prompt
-- (answers + source) or a standalone one (body).
create or replace function public.shared_prompt(p_slug text)
returns table(
  name text, body text, answers jsonb,
  source_kind text, catalog_slug text, user_template_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select name, body, answers, source_kind, catalog_slug, user_template_id
  from public.saved_prompts
  where share_slug = p_slug and visibility in ('published', 'unlisted')
$$;

revoke all on function public.shared_prompt(text) from public;
grant execute on function public.shared_prompt(text) to anon, authenticated;

-- Tighten the existing notebook share RPC to honour visibility (a re-drafted
-- notebook with a retained slug must stop being readable).
create or replace function public.shared_notebook(p_slug text)
returns table(name text, doc jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select name, doc
  from public.prompt_notebooks
  where share_slug = p_slug and visibility in ('published', 'unlisted')
$$;
