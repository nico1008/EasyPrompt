-- EasyPrompt - allow curated Prompt favorites.
--
-- 0005 created bookmarks for catalog Templates only. The app now treats
-- bookmarks as Favorites for both catalog Templates and curated example Prompts,
-- so the database check constraint must allow `example_prompt` too.

alter table public.bookmarks
  drop constraint if exists bookmarks_target_kind_check;

alter table public.bookmarks
  add constraint bookmarks_target_kind_check
  check (target_kind in ('catalog', 'example_prompt'));
