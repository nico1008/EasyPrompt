# EasyPrompt

A form-to-prompt builder. Pick a template, answer a short form, and copy a ready-to-paste prompt
for ChatGPT, Claude, or Gemini. Create a free account to save prompts and build your own templates.

Built with **Next.js 15** (App Router), **React 19**, **TypeScript**, and **Supabase**.

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

The builder works anonymously out of the box. Account features (saving prompts, authoring
templates) light up once Supabase is configured.

## Environment

Set these in `.env.local`, and in your host's **build** environment for production:

| Variable | Needed for | Purpose |
|---|---|---|
| `ACCESS_SIGNING_SECRET` | Pro access codes | HMAC secret that signs/verifies access codes. Use a long random string: `openssl rand -base64 48`. |
| `NEXT_PUBLIC_SUPABASE_URL` | accounts | Supabase project URL (Project Settings → API). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | accounts | Supabase anon / publishable key. Safe in the browser — it's gated by Row-Level Security. |
| `PAYMENT_PROVIDER` | optional | `telegram` (default) or `crypto`. |
| `PRO_BOOSTERS_B64` | optional | base64 JSON of the Pro Boosters content (kept out of the repo). Unset → a small generic sample. |

> ⚠️ The `NEXT_PUBLIC_*` vars are inlined at **build time** — they must be present when the app is
> built (e.g. in Vercel's build environment), not only at runtime. If they're absent the account UI
> stays off and the anonymous builder still works.

## Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com) and set the two
   `NEXT_PUBLIC_SUPABASE_*` vars above.
2. Apply the schema: open the project's **SQL Editor** and run
   [`supabase/migrations/0001_accounts.sql`](supabase/migrations/0001_accounts.sql). It creates
   `profiles`, `user_templates`, and `saved_prompts` with **Row-Level Security** (each user can only
   ever read/write their own rows), a profile-on-signup trigger, and a self-serve account-deletion
   RPC. No service-role key is needed.
3. In **Authentication → URL Configuration**, set the Site URL and add a redirect URL ending in
   `/auth/confirm` (for both localhost and your production domain).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |

## Project layout

- `app/` — App Router pages + per-route CSS. `app/prompts/[slug]` is the catalog builder (statically
  generated per template, for SEO); `app/(auth)`, `app/my`, `app/account` are the account areas.
- `components/` — presentational UI and small client islands.
- `lib/` — `buildPrompt.ts` (pure prompt assembly), `supabase/` (clients + the `isSupabaseConfigured`
  gate), and `auth/` · `userTemplates/` · `savedPrompts/` (Zod-validated Server Actions + RLS-scoped
  data access).
- `data/` — the content schema and the static template catalog.
- `supabase/migrations/` — the database schema.

## Architecture notes

- **Auth** uses Supabase with httpOnly cookies. All mutations are Server Actions; `middleware.ts`
  refreshes the session and guards `/my` + `/account`. Authorization is enforced in the database by
  Row-Level Security, with server-side `getUser()` checks as defense in depth.
- **Static-first:** marketing pages and the per-template catalog stay statically rendered. Nav auth
  state is resolved client-side, so the shared layout never reads cookies (which would otherwise
  force every page to render dynamically).

## Deploy

Targets Vercel. Add the environment variables above to the project's settings (so they're present at
build time), then deploy.
