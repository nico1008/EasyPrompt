export const RESERVED_USERNAMES = [
  "account",
  "api",
  "auth",
  "build",
  "forgot-password",
  "how-it-works",
  "login",
  "my",
  "p",
  "pricing",
  "privacy",
  "prompts",
  "reset-password",
  "s",
  "signup",
  "submit-template",
  "templates",
  "terms",
  "u",
] as const;

export const USERNAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase() as (typeof RESERVED_USERNAMES)[number]);
}

export function deriveUsernameFromEmail(email: string): string {
  const localPart = email.split("@", 1)[0] ?? "";
  return localPart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30)
    .replace(/-$/g, "");
}
