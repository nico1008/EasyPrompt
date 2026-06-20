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

## Known Limitation

Pro access codes are currently verified using a stateless model and are not bound to a specific user or device. As a result, a purchased code may be shared between multiple users.

This does **not** expose user data or compromise accounts, but it may result in unauthorized access to paid features. A redemption-tracking system may be introduced in a future release.

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately:

**[security@easyprompt.app](mailto:security@easyprompt.app)**

Please do not open public issues for security reports.
