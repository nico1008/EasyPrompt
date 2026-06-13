import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthShell, NotConfigured } from "../shell";
import { LoginForm } from "../AuthForms";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const { next, error } = await searchParams;
  const user = await getServerUser();
  if (user) redirect(next?.startsWith("/") ? next : "/my");

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in"
      subtitle="Pick up your saved prompts and templates."
    >
      {error === "confirm" && (
        <p className="auth-error" role="alert" style={{ marginBottom: 16 }}>
          That link didn&apos;t work or has expired. Log in, or request a new link.
        </p>
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}
