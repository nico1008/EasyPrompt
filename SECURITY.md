# Security

EasyPrompt follows a defense-in-depth approach:

* Row-Level Security (RLS) on all user data
* Owner-scoped access using `auth.uid()`
* Server-side secrets only
* Zod validation on all inputs
* Server Actions and authenticated API routes for mutations
* Strict security headers on every route
* No service-role key required in production

## Security Controls

### Database Security

* RLS enabled on all tables
* Access restricted to resource owners
* Authorization enforced at both the database and application layers

### Authentication

* Supabase Authentication
* Email verification support
* Leaked password protection
* User enumeration protection

### Application Security

* Input validation with Zod
* CSRF protection through Next.js Server Actions
* Rate limiting on sensitive endpoints
* Content Security Policy (CSP)
* X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers

## Access-Code Model

Pro access codes use a stateless, HMAC-signed model. When a user is signed in, redemption binds the
entitlement to the account through owner-scoped storage. Anonymous redemption is bearer-style and is
intended for low-friction access without account setup. It does not expose user data or weaken account
isolation.

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately:

**[security@easyprompt.app](mailto:security@easyprompt.app)**

Please do not open public issues for security reports.
