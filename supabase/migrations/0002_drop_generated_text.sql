-- EasyPrompt — drop the unused saved_prompts.generated_text column.
-- Apply via Supabase Dashboard → SQL Editor (paste + Run) or `supabase db push`.
--
-- Rationale: a saved prompt's `answers` are the durable source of truth; the
-- prompt text is *derived* (lib/buildPrompt.ts) and recomputed every time a
-- saved prompt is opened. The stored `generated_text` snapshot was written on
-- save but never read back, so it was dead weight (up to ~50KB/row) that could
-- also drift from what the current template produces. Discarding it is safe.

alter table public.saved_prompts drop column if exists generated_text;
