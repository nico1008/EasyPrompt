# AGENTS.md

EasyPrompt is a Next.js app for AI prompting built around two product objects:
**Templates** and **Prompts**. Templates are reusable frameworks with variables. Prompts are
ready-to-use content. The main public experience is browsing the Template and Prompt catalogs; users
build their own only when the catalogs do not fit. Accounts are optional. The anonymous builder works
without Supabase, gated by `isSupabaseConfigured()`.

## Non-negotiables
- Use product language in UI copy: **Template** and **Prompt**. Do not expose storage/internal words
  like notebook, saved, authored, or table names.
- Templates are empty constructors. Opening a Template starts blank unless the user explicitly restores
  a draft.
- Prompts are ready-to-use content. Template-sourced Prompts may link back to the source Template;
  standalone/manual/import Prompts should not show a source Template link.
- `visibility` is the source of truth for private/public state. Treat legacy `is_public` columns as
  implementation baggage.
- Do not read signed-in auth state in `app/layout.tsx`; it can make static routes dynamic.
- CSS imported in App Router is global. Prefix route CSS under a page-root class.
- Supabase migrations must be applied before matching code is considered done, and
  `lib/supabase/types.ts` must stay in sync.
- Small UI changes do not need browser verification by default. Broad layout or interaction-heavy
  changes do.

## Stack
- Next.js 15.5.19 (App Router) · React 19 · TypeScript 5.7 (strict)
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`) for auth + Postgres; `zod` 4 for input validation
- Vitest 3 for tests (node environment, globals on)
- `@/*` path alias → repo root (see `tsconfig.json`; mirrored in Vitest via `vite-tsconfig-paths`)

## Commands
- `npm run dev` — dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the build
- `npm run test` — run the Vitest suite once
- `npm run test:watch` — watch mode
- `ACCESS_SIGNING_SECRET=… npm run mint -- --plan lifetime` — issue a Pro access code
  (`scripts/mint.ts`; `--plan pass --days 30` for a time-limited pass). Same secret as the verifier.
- Lint is **not runnable**: `.eslintrc.json` exists but the `eslint` package is not installed, and
  `next build` skips lint via `eslint.ignoreDuringBuilds` (`next.config.mjs`). Don't rely on `npm run
  lint`; the quality gate is `npm run test` + `tsc` (strict). See ENGINEERING.md.

## Agent workflow
### Commits
- After completing a task that changes repo files, Codex must create a git commit.
- Before committing, inspect `git status` and `git diff`.
- Commit only the intended changes.
- Do not commit unrelated user/local changes.
- Do not commit if there are no repo changes, the task is blocked, tests/checks fail in a way that
  should block completion, or the user explicitly asks not to commit.
- The commit subject must start with an emoji.
- Keep commit subjects professional and user-safe. Do not expose critical mistakes, vulnerabilities,
  secrets, embarrassing failures, or exploit details. Phrase the subject as the improvement shipped.
- Example format: `✨ Add prompt editor autosave`.

### Docs
- After a significant task, update the relevant docs in the same change.
- Significant means changes to architecture, data flow, public routes, database schema/RPCs, auth,
  content model, design system, commands, or developer workflow.
- Use the most relevant doc: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ENGINEERING.md`, or
  `docs/DESIGN-SYSTEM.md`.
- Project docs under `docs/` are local-only and must not be published to GitHub. Do not force-add
  ignored docs. `PRODUCT.md` is also local-only. Repo-facing docs such as `README.md` and
  `SECURITY.md` are allowed.
- If no docs need changes, say so in the final response.

### Final response
- Summarize what changed.
- Mention tests/checks run.
- Mention whether docs were updated or why not.
- Mention the commit hash/subject if a commit was created.

## Working efficiently in this repo
- **Behavior lives in `lib/` + `data/`, and it's pure.** To understand or change logic, read the
  relevant `lib/<area>/` module and its `tests/<area>.test.ts` — not the React tree. The `app/` and
  `components/` layers are thin shells over these.
- **One schema file:** `lib/supabase/types.ts` lists every table + RPC. Read it instead of opening
  all migration SQL files; reach for a specific `supabase/migrations/000N_*.sql` only when you
  need the exact DDL/policy.
- **Targeted over broad:** the file/area names are descriptive (`lib/ratings`, `lib/community`,
  `lib/metrics`…). Prefer a scoped Read/Grep to a repo-wide sweep; `node_modules`, `.next`, and
  `.agents/skills` are large and irrelevant.
- **Tests are the contract editor:** catalog/template invariants, schemas, and mappers are all
  unit-tested — change the data, run `npm run test`, let the failures guide you.
- **Database migrations are agent-applied:** when adding a Supabase migration, Codex must apply it to
  the project database before calling the task done. Before applying, verify the target project,
  confirm the migration is not already applied, inspect the SQL for destructive or unsafe behavior,
  and run a post-apply verification query.
- The three `docs/` files (`ARCHITECTURE`, `ENGINEERING`, `DESIGN-SYSTEM`) are deeper references.
  Do not reread all docs by default. Read or update the relevant doc when the task touches that area.
  Keep `AGENTS.md` focused on rules future agents must see. Leave `docs/` ignored unless the user
  explicitly changes the repository publishing policy.

## UI verification discipline
- Do not launch a dev server or browser visual check for every UI change.
- For small or medium UI changes, rely on code inspection plus targeted type/build/test checks when
  they are useful. The user will do visual confirmation.
- Use browser visual verification only for complex, broad, high-risk, or interaction-heavy UI work
  where rendered behavior is hard to reason about from code.
- If the need for visual verification is unclear, ask the user before starting a dev server.
- Do not start `npm run dev`, `npm run start`, or browser tooling solely because a UI file changed.

## Project map
- `data/types.ts` defines the Template schema. `data/templates.ts` and `data/prompts.ts` hold the
  static catalogs and pure helpers.
- `lib/buildPrompt.ts` assembles generated prompt text. Blank fields are skipped. `blankAnswers` is
  the only normal starting state for opening a Template.
- Domain behavior lives in `lib/<area>/`: schemas, mappers, repos, actions, and pure helpers.
  Tests live in `tests/<area>.test.ts`.
- `app/templates` and `app/prompts` are the primary public browsing surfaces. `app/build` is the
  secondary create hub.
- `app/templates/[slug]` fills a Template. `app/prompts/[slug]` opens a curated example Prompt or a
  public user Prompt. Library Prompts open under `app/my/prompts/[id]`.
- `app/settings` is the protected account/settings surface. `app/account` redirects there.
- `components/` contains presentational components and small client islands. `components/iconNames.ts`
  is the runtime icon source.
- Deeper references: `docs/ARCHITECTURE.md` for system/data details, `docs/ENGINEERING.md` for
  commands and operations, and `docs/DESIGN-SYSTEM.md` for visual rules.

## Product model
- **Template:** a reusable framework with variables. A Template opens blank. Authored defaults are
  validation/test references, not UI prefill.
- **Prompt:** ready-to-use content. Manual Prompts store markdown. Template-sourced Prompts store
  answers and may show "Created from {Template}".
- **My Library:** one merged library of Templates, Prompts, and Favorites. Avoid internal storage
  words in user-facing copy.
- **Visibility:** use `visibility: private | public`. Private rows are owner-only even if a legacy
  slug exists. Public rows resolve through public slug/RPC paths.
- **Community:** public Templates and Prompts appear in community/profile listings by username.
  Remix attribution exists for community Prompts.
- **Deferred:** import and AI-generated Prompt source kinds exist in the enum but do not have product
  routes yet.

## Accounts and Supabase
- Supabase is optional. If `NEXT_PUBLIC_SUPABASE_*` is absent, account UI stays off and anonymous
  builder flows must still work.
- Auth uses `@supabase/ssr` cookies. Server authorization uses `getUser()`, never `getSession()`.
- Server reads go through RLS-scoped repos. Mutations are Server Actions with Zod validation.
- `middleware.ts` refreshes sessions and protects `/my` and `/settings`.
- Client nav/account display state comes from `GET /api/account-state` after mount. Do not read auth
  in `app/layout.tsx`.
- Public cross-user reads go through security-definer RPCs. Do not select another user's rows
  directly from app code.
- For database changes, add/apply the migration and update `lib/supabase/types.ts`. The migration
  list and schema notes belong in `docs/ARCHITECTURE.md`, not here.

## Drafts and persistence
- Anonymous Template answers autosave to `localStorage` through `lib/drafts`.
- Draft restore is opt-in via `restoreDrafts`. Catalog/user Template pages start from `blankAnswers`
  and clear stale drafts so Templates stay empty constructors.
- Reopening a library Prompt uses its stored answers/body. Do not mix Prompt state with anonymous
  Template drafts.

## Pro, metrics, and rate limits
- Pro uses signed HMAC codes/tokens. Anonymous codes live in localStorage. Logged-in redemption binds
  Pro to the account through `entitlements`.
- Usage metrics count copies and open-ins. `/api/track` records via RPC with salted hashes; raw PII
  must not reach the database.
- API routes use coarse in-memory rate limiting in `lib/rateLimit.ts`.

## Design system
- Route roots should stay transparent so the global grid/cursor field can show through. Put dense
  text and forms on opaque `.panel` or `.code-well` surfaces.
- New elevated/fixed UI must use an appropriate `--z-*` token and must not sit under the background
  field.
- Prompt surfaces use the dark markdown identity (`--bg-md`, `--prompt-accent`). Template surfaces
  use the lighter catalog identity.

## Adding a template
Append an object to `TEMPLATES` in `data/templates.ts`. It must satisfy the invariants the tests
enforce (`tests/templates.test.ts`):
- unique `id` and `slug`
- `category` exists in `CATEGORIES`
- `icon` is a member of the `IconName` union in `components/Icon.tsx`
- field ids and checkbox ids are unique within the template
- `defaultAnswers` must build a non-empty prompt with no leftover `[BRACKET]` placeholders

Then run `npm run test`. Adding a *new* icon means editing BOTH `components/iconNames.ts` (the
runtime `ICON_NAMES` source) and the `VALID_ICONS` mirror in `tests/templates.test.ts`.

## Gotchas (Next.js App Router)
- **All imported CSS is global.** Co-locating a `page.css` per route does NOT scope it; generic
  class names (`.card`, `.layout`) collide across routes. Fix: prefix every rule with a page-root
  class (`.picker-page .card`, `.builder-page .card`). Watch specificity too — a base `.nav .links`
  (0,2,0) beats a mobile override `.nav-links` (0,1,0) even inside a media query; use
  `.nav .nav-links`.
- **Root `not-found.tsx` renders with empty CSS in `next dev`** (unstyled black page). Dev-only
  quirk; `next build`/`next start` prerenders `/_not-found` with the full stylesheet. Verify the 404
  against a production server, not dev.
- **The cursor glow only reads on the grid, and the grid only shows on a transparent root.**
  The glow (`.cursor-glow`) is a soft indigo radial *below* content; if a page paints an opaque
  background over `body::before`, both the grid and the glow vanish there. Keep page roots
  `background: transparent` so the field stays consistent across routes.
- **Never read the signed-in user in the root layout.** Calling `getServerUser()` / `cookies()` in
  `app/layout.tsx` forces *every* route dynamic — it silently flips the marketing pages and the SSG
  catalog from static to `ƒ`. Nav auth state is resolved **client-side** (`lib/supabase/useUser.ts`,
  same hydrate-after-mount pattern as `PremiumProvider`); per-request user reads live only in
  protected account routes like `/my` and `/settings`. Confirm with the `npm run build` route table
  (○/● vs ƒ).
- **`NEXT_PUBLIC_*` are inlined at BUILD time, not runtime.** They must be present in the build env
  (e.g. Vercel) or the client half thinks accounts are off even if the server has them. Also: don't
  run `next build` while a dev server is live (drops CSS / corrupts `.next`) — restart dev afterward.

## Testing
Vitest runs pure node tests in `tests/**/*.test.ts`. Core logic in `lib/` and `data/` is designed to
be tested without DOM or live Supabase. Use targeted tests for the area you touched; use
`npm run test` for catalog/schema/content-model changes. Current gaps: no API-route handler tests and
no e2e/a11y suite yet.
