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
}: {
  links: ProviderOpenLinks;
  className?: string;
  compact?: boolean;
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
          href={links[provider].href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={links[provider].onClick}
          aria-label={LABELS[provider]}
          title={LABELS[provider]}
        >
          <img className="provider-mark" src={ICONS[provider]} alt="" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
