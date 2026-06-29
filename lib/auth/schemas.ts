/* Zod schemas for every auth/profile input. Pure — no server-only imports —
 * so server actions AND unit tests both import from here. Keep the password
 * ceiling at 72 (bcrypt's max input is 72 bytes; Supabase hashes with bcrypt). */

import { z } from "zod";
import { isReservedUsername, USERNAME_REGEX } from "./usernames";

export const emailSchema = z.email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Keep your password under 72 characters.");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username needs at least 3 characters.")
  .max(30, "Keep your username under 30 characters.")
  .regex(USERNAME_REGEX, "Use letters, numbers, and single hyphens.")
  .refine((username) => !isReservedUsername(username), "That username is reserved.");

export const signUpSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const requestResetSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
});

/** Profile edits keep username required because account URLs are username-based. */
export const profileSchema = z.object({
  username: usernameSchema,
  bio: z.string().trim().max(200, "Keep your bio under 200 characters.").optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

/** Shared shape returned by every auth server action (works with useActionState). */
export type ActionState = {
  ok?: boolean;
  /** Top-level error to show above the form. */
  error?: string;
  /** Per-field errors keyed by field name. */
  fieldErrors?: Record<string, string[]>;
  /** Success message (e.g. "Check your email"). */
  message?: string;
};
