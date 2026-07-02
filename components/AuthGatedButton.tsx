"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { AuthPromptDialog } from "@/components/AuthPromptDialog";
import type { IconName } from "@/components/Icon";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseAccountState } from "@/lib/supabase/useUser";

export type AuthGateCopy = {
  title: string;
  body: string;
  icon?: IconName;
  signupLabel?: string;
  loginLabel?: string;
  dismissLabel?: string;
};

export function currentAuthNext(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  return window.location.pathname + window.location.search;
}

export function AuthGatedButton({
  children,
  className,
  type = "button",
  disabled = false,
  next,
  prompt,
  onAuthedClick,
  onBeforeAuthNavigate,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className: string;
  type?: "button" | "submit";
  disabled?: boolean;
  next?: string | (() => string);
  prompt: AuthGateCopy;
  onAuthedClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onBeforeAuthNavigate?: () => void;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dialogNext, setDialogNext] = useState("/");
  const { account, loaded } = useSupabaseAccountState();
  const accountsOn = isSupabaseConfigured();
  const loggedIn = Boolean(account);
  const authPending = accountsOn && !loaded;

  return (
    <>
      <button
        type={type}
        className={className}
        disabled={disabled || authPending}
        aria-label={ariaLabel}
        onClick={(event) => {
          if (!accountsOn || loggedIn) {
            onAuthedClick?.(event);
            return;
          }
          event.preventDefault();
          setDialogNext(typeof next === "function" ? next() : next ?? currentAuthNext());
          setOpen(true);
        }}
      >
        {children}
      </button>
      {accountsOn && (
        <AuthPromptDialog
          open={open}
          next={dialogNext}
          title={prompt.title}
          body={prompt.body}
          icon={prompt.icon}
          signupLabel={prompt.signupLabel}
          loginLabel={prompt.loginLabel}
          dismissLabel={prompt.dismissLabel}
          onBeforeAuthNavigate={onBeforeAuthNavigate}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
