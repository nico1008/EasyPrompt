const DEFAULT_AUTH_REDIRECT = "/my";

function normalizePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  if (/[\u0000-\u001f\u007f]/.test(path)) return null;
  return path;
}

/** Keep auth redirects on this site. Prevents open redirects via `next`. */
export function safeAuthRedirect(
  value: unknown,
  fallback = DEFAULT_AUTH_REDIRECT
): string {
  return normalizePath(value) ?? normalizePath(fallback) ?? DEFAULT_AUTH_REDIRECT;
}
