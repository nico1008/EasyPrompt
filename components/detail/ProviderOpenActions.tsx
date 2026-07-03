import type { MouseEventHandler } from "react";

type ProviderId = "chatgpt" | "claude" | "gemini";

export type ProviderOpenLink = {
  href: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export type ProviderOpenLinks = Record<ProviderId, ProviderOpenLink>;

const LABELS: Record<ProviderId, string> = {
  chatgpt: "Open in ChatGPT",
  claude: "Open in Claude",
  gemini: "Open in Gemini",
};

const ICONS: Record<ProviderId, string> = {
  chatgpt: "/brand/providers/chatgpt.webp",
  claude: "/brand/providers/claude.webp",
  gemini: "/brand/providers/gemini.webp",
};

const PROVIDERS: ProviderId[] = ["chatgpt", "claude", "gemini"];

export function ProviderOpenActions({
  links,
  className,
  compact = false,
  disabled = false,
}: {
  links: ProviderOpenLinks;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={`provider-open-actions${compact ? " is-compact" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-label="Open this prompt in"
    >
      {PROVIDERS.map((provider) => (
        <a
          key={provider}
          className={`provider-open provider-open-${provider}`}
          href={disabled ? "#" : links[provider].href}
          target={disabled ? undefined : "_blank"}
          rel={disabled ? undefined : "noopener noreferrer"}
          onClick={(event) => {
            if (disabled) {
              event.preventDefault();
              return;
            }
            links[provider].onClick?.(event);
          }}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : undefined}
          aria-label={LABELS[provider]}
          title={LABELS[provider]}
        >
          <img className="provider-mark" src={ICONS[provider]} alt="" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
