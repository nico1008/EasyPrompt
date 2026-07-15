-- Keep legacy notebook Templates recoverable while their canonical migration is
-- pending. New Templates already use user_templates and the canonical lifecycle.
alter table public.prompt_notebooks
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz;

create index if not exists prompt_notebooks_owner_active_idx
  on public.prompt_notebooks (owner_id, updated_at desc)
  where deleted_at is null;
