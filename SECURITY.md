# Security

EasyPrompt follows a defense-in-depth approach:

* Row-Level Security (RLS) on all user data
* Owner-scoped access using `auth.uid()`
* Server-side secrets only
* Zod validation on all inputs
* Server Actions and authenticated API routes for mutations
* Strict security headers on every route
* Service-role key isolated to server-only validated writes

## Security Controls

### Database Security

* RLS enabled on all tables
* Access restricted to resource owners
* Authorization enforced at both the database and application layers

### Authentication

* Supabase Authentication
* Email verification support
* User enumeration protection
* Leaked password protection should be enabled in Supabase Auth settings; the security advisor must be checked after auth changes
* No authorization decisions from `user_metadata`

### Supabase Auth Contract

* `user_metadata` is user-controlled and is never used for roles, ownership, Pro status, publishing, or permissions.
* Permission sources must be server-controlled: RLS owner rows, signed server claims, `app_metadata`, or validated server-only provider checks.
* Browser Supabase clients use only `NEXT_PUBLIC_SUPABASE_ANON_KEY` plus RLS.
* `SUPABASE_SERVICE_ROLE_KEY` is server-only. It is used only after explicit checks, such as signed-code validation plus `getUser()` for entitlement redemption.
* Entitlement rows are read by owners through RLS, but writes are blocked from normal authenticated clients.
* Publishing writes to `visibility` and `share_slug` go through a narrow `SECURITY DEFINER` RPC that checks `auth.uid()`, target kind, owner, id, and allowed visibility values.

### Application Security

* Input validation with Zod
* CSRF protection through Next.js Server Actions
* Rate limiting on sensitive endpoints
* Content Security Policy (CSP)
* X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers

## Access-Code Model

Pro access codes use a stateless, HMAC-signed model. When a user is signed in, redemption binds the
entitlement to the account through a server-only privileged write after the code is validated and the
user is resolved with `getUser()`. Anonymous redemption is bearer-style and is
intended for low-friction access without account setup. It does not expose user data or weaken account
isolation.

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately:

**[security@easyprompt.app](mailto:security@easyprompt.app)**

Please do not open public issues for security reports.
