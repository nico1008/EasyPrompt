import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeAuthRedirect } from "@/lib/auth/redirects";
import { AuthShell, NotConfigured } from "../shell";
import { SignupForm } from "../AuthForms";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const { next } = await searchParams;
  const nextPath = safeAuthRedirect(next);
  const user = await getServerUser();
  if (user) redirect(nextPath);

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Choose your username, save prompts, and build your own templates."
    >
      <SignupForm next={nextPath} />
    </AuthShell>
  );
}
