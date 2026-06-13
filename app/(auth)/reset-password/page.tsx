import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthShell, NotConfigured } from "../shell";
import { ResetForm } from "../AuthForms";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

/* The user lands here from the recovery email link, which first hits
   /auth/confirm — that exchanges the recovery token and establishes a session,
   then redirects here. updatePasswordAction then sets the new password. */
export default function ResetPasswordPage() {
  if (!isSupabaseConfigured()) return <NotConfigured />;

  return (
    <AuthShell
      eyebrow="Reset"
      title="Set a new password"
      subtitle="Choose a new password for your account."
    >
      <ResetForm />
    </AuthShell>
  );
}
