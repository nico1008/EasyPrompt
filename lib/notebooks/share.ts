/* Pure helpers for public prompt sharing. The share slug is a capability token:
 * a notebook is readable at /p/<slug> only by someone who has the exact,
 * unguessable slug — there is no public table read and no way to enumerate.
 * Kept pure (no server/React imports) so it's unit-tested and reusable. */

import { z } from "zod";

/** 128 bits of randomness as 32 lowercase hex chars — url-safe, unguessable. */
export function makeShareSlug(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Accept a plausibly-valid slug before hitting the RPC (cheap input guard). */
export const shareSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]{8,64}$/, "Not a valid share link.");

/** Absolute share URL for a slug, given an origin (no trailing slash). */
export function shareUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, "")}/p/${slug}`;
}
