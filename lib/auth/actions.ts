"use server";

/* All auth + profile mutations as Server Actions. Server Actions are
 * Origin-checked by Next (CSRF defense) and keep every credential server-side.
 * Each form-bound action takes (prevState, formData) and returns ActionState so
 * it plugs straight into useActionState; signOut/deleteAccount are plain form
 * actions that redirect. */

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  signUpSchema,
  signInSchema,
  requestResetSchema,
  updatePasswordSchema,
  profileSchema,
  type ActionState,
} from "./schemas";

const NOT_CONFIGURED: ActionState = {
  error: "Accounts aren't set up on this deployment yet.",
};

/** Absolute site origin, for email redirect links. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/** Only allow same-site, single-slash redirect targets (no open redirects). */
function safeNext(value: FormDataEntryValue | null): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/my";
}

/** Map Supabase auth error messages to something a human wants to read. */
function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login")) return "That email or password is incorrect.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with that email already exists. Try logging in instead.";
  if (m.includes("rate") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("weak") || m.includes("password"))
    return "That password was rejected — try a longer, less common one.";
  return message || "Something went wrong. Please try again.";
}

/* --------------------------------- sign up -------------------------------- */
export async function signUpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { fieldErrors };
  }

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent(
        next
      )}`,
    },
  });

  if (error) return { error: friendlyAuthError(error.message) };

  // If email confirmations are OFF, Supabase returns a live session: go straight in.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  return {
    ok: true,
    message:
      "Almost there — check your email for a confirmation link to finish signing up.",
  };
}

/* --------------------------------- sign in -------------------------------- */
export async function signInAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: friendlyAuthError(error.message) };

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

/* ----------------------------- request reset ------------------------------ */
export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { fieldErrors };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent(
      "/reset-password"
    )}`,
  });

  // Always report success — never reveal whether an account exists.
  return {
    ok: true,
    message:
      "If an account exists for that email, a password-reset link is on its way.",
  };
}

/* ---------------------------- update password ----------------------------- */
export async function updatePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendlyAuthError(error.message) };

  return { ok: true, message: "Your password has been updated." };
}

/* ----------------------------- update profile ----------------------------- */
export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  // Coerce empty strings to undefined so blanks clear instead of failing rules.
  const rawName = (formData.get("display_name") as string | null)?.trim() || undefined;
  const rawUser = (formData.get("username") as string | null)?.trim() || undefined;

  const parsed = profileSchema.safeParse({
    display_name: rawName,
    username: rawUser,
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in again." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name ?? null,
      username: parsed.data.username ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505")
      return { fieldErrors: { username: ["That username is already taken."] } };
    return { error: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/account");
  return { ok: true, message: "Profile saved." };
}

/* --------------------------------- sign out ------------------------------- */
export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
  }
  redirect("/");
}

/* ------------------------------ delete account ---------------------------- */
export async function deleteAccountAction(): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // security-definer RPC: deletes auth.users row → cascades to all owned data.
  await supabase.rpc("delete_current_user");
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/?account=deleted");
}
