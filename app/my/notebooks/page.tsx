import { redirect } from "next/navigation";

/* The builder-prompts list moved into the unified hub at /my (the "Built" tab).
 * Keep this path working for old links by redirecting. The editor lives at
 * /my/notebooks/[id]. */
export default function MyNotebooksRedirect() {
  redirect("/my");
}
