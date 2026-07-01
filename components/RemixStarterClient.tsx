"use client";

import { AuthGatedButton, currentAuthNext } from "@/components/AuthGatedButton";
import { Icon } from "@/components/Icon";

type RemixAction = (formData: FormData) => void | Promise<void>;

export function RemixStarterClient({
  slug,
  action,
}: {
  slug: string;
  action: RemixAction;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="share_slug" value={slug} />
      <AuthGatedButton
        type="submit"
        className="btn btn-ink"
        next={() => currentAuthNext(`/prompts/${slug}`)}
        prompt={{
          title: "Create an account to save this Prompt",
          body: "Use this Prompt as a starting point and keep your remix in My Library.",
          icon: "wrench",
          dismissLabel: "Keep reading",
        }}
      >
        <Icon name="wrench" size={15} /> Use as starting point
      </AuthGatedButton>
    </form>
  );
}
