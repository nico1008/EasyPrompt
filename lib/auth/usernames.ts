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
