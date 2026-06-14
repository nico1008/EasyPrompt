/** @type {import('next').NextConfig} */

/* Security headers for every route. CSP starts in Report-Only so a violation
 * can't break the site silently; promote to Content-Security-Policy once the
 * report stream is quiet (see docs/ARCHITECTURE.md → Security posture).
 * 'unsafe-inline' style-src is required by Next's inlined critical CSS and
 * the font-variable style attribute set in app/layout.tsx. */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
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
  { key: "Content-Security-Policy-Report-Only", value: csp },
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
