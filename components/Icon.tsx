import type { CSSProperties } from "react";

/* Stroke SVG icon set — 1.8 stroke, currentColor, rounded line ends (per
   DESIGN_GUIDELINES §11). Paths are lifted verbatim from the prototypes so the
   builder/picker/landing share one source. `name` keys the map. */

import type { IconName } from "./iconNames";
export type { IconName };

const PATHS: Record<IconName, React.ReactNode> = {
  meal: (
    <>
      <path d="M4 7h16v3H4z" />
      <path d="M5 10v9h14v-9" />
      <path d="M9 14h6" />
    </>
  ),
  letter: (
    <>
      <path d="M4 4h12l4 4v12H4z" />
      <path d="M16 4v4h4" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
  lesson: (
    <>
      <path d="M3 6l9-3 9 3-9 3z" />
      <path d="M7 8v6c0 2 2 3 5 3s5-1 5-3V8" />
    </>
  ),
  email: <path d="M3 12h18M5 12v8h14v-8M7 8h10l-1-4H8z" />,
  house: (
    <>
      <path d="M3 10l9-7 9 7v11H3z" />
      <path d="M9 21V12h6v9" />
    </>
  ),
  toast: <path d="M12 21s-7-5-7-11a7 7 0 0 1 14 0c0 6-7 11-7 11z" />,
  workout: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  code: (
    <>
      <polyline points="8 4 4 12 8 20" />
      <polyline points="16 4 20 12 16 20" />
    </>
  ),
  review: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M8 13h2M8 16h6" />
    </>
  ),
  teacher: (
    <>
      <path d="M4 19V5l8 5 8-5v14" />
      <path d="M4 19h16" />
    </>
  ),
  chart: (
    <>
      <path d="M3 12l3-3 4 4 5-6 6 8" />
      <path d="M3 21h18" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M9 8V5a3 3 0 0 1 6 0v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  star: <path d="M12 2l3 7 7 .5-5.5 4.5L18 21l-6-4-6 4 1.5-7L2 9.5 9 9z" />,
  "arrow-right": (
    <>
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="14 6 20 12 14 18" />
    </>
  ),
  menu: (
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  zap: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

/* The star icon is filled in the prototype; everything else is stroked. */
const FILLED: IconName[] = ["star"];

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  style,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}) {
  const filled = FILLED.includes(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
