import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthShell, NotConfigured } from "../shell";
import { ForgotForm } from "../AuthForms";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  if (!isSupabaseConfigured()) return <NotConfigured />;

  return (
    <AuthShell
      eyebrow="Reset"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send a reset link."
    >
      <ForgotForm />
    </AuthShell>
  );
}
