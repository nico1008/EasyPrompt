-- Allow Favorites to point at public community Templates and Prompts by share slug.
-- Ownership remains enforced by the existing bookmarks_owner_all RLS policy.

alter table public.bookmarks
  drop constraint if exists bookmarks_target_kind_check;

alter table public.bookmarks
  add constraint bookmarks_target_kind_check
  check (target_kind in ('catalog', 'example_prompt', 'user_template', 'user_prompt'));
