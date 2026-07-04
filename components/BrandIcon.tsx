export function BrandIcon() {
  return (
    <svg
      className="brand-icon"
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="brand-icon-bg" width="64" height="64" rx="14" fill="#fff" />
      <path
        className="brand-icon-template"
        d="M15 18.5 33 32 15 45.5"
        fill="none"
        stroke="#5B5BFF"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect className="brand-icon-prompt" x="44" y="13" width="10" height="38" rx="5" fill="#0F7A57" />
      <rect
        className="brand-icon-edge"
        x="0.5"
        y="0.5"
        width="63"
        height="63"
        rx="13.5"
        fill="none"
        stroke="rgba(15, 15, 30, 0.08)"
      />
    </svg>
  );
}
