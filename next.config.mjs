/** @type {import('next').NextConfig} */

/* Security headers for every route. CSP is ENFORCED (not Report-Only): the app
 * has no raw-HTML sinks (no dangerouslySetInnerHTML/innerHTML/eval) so a strict
 * policy is safe to enforce. 'unsafe-inline' is still required by Next's inlined
 * hydration scripts + critical CSS and the font-variable style attribute set in
 * app/layout.tsx; tightening to a nonce-based script-src (Next middleware nonce)
 * to drop script 'unsafe-inline' is the documented next step. connect-src allows
 * Supabase Auth/PostgREST (+ wss for future realtime); everything else is 'self'. */
const isDevelopment = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // Supabase Auth + Postgrest (and wss for any future realtime) for user accounts.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  // This project doesn't use ESLint (no config); skip the lint step `next build`
  // runs by default so the build doesn't fail looking for an eslint install.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
