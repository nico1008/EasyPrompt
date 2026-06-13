import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TemplateEditor } from "@/components/TemplateEditor";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "New template",
  robots: { index: false, follow: false },
};

export default async function NewTemplatePage() {
  if (!isSupabaseConfigured()) redirect("/");
  const user = await getServerUser();
  if (!user) redirect("/login?next=/my/templates/new");
  return <TemplateEditor />;
}
