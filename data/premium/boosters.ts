/* Pro Boosters — the paywalled premium content.
 *
 * The REAL content is NOT in this repo. It's injected at runtime via the
 * PRO_BOOSTERS_B64 env var (base64 of a JSON object `{ global: Booster[],
 * byTemplate: Record<templateId, Booster[]> }`), so a public repo never ships
 * the paid text. Set it in .env.local for dev and in the host's build/runtime
 * env for production (see .env.example). When unset, a small generic SAMPLE is
 * used so the feature is demoable without exposing anything.
 *
 * `import "server-only"` still makes this a hard build error if anything in the
 * client graph imports it — the booster text is only ever read by `GET
 * /api/premium`, behind a valid Bearer token. */

import "server-only";

export type Booster = {
  id: string;
  label: string;
  /** Short UI hint shown next to the toggle. */
  note?: string;
  /** The text appended to the built prompt when the booster is enabled. */
  text: string;
};

type BoosterData = { global: Booster[]; byTemplate: Record<string, Booster[]> };

/* Generic placeholder (NOT the paid content) so dev/demo works without the env. */
const SAMPLE: BoosterData = {
  global: [
    {
      id: "role-prime",
      label: "Expert role priming",
      note: "Sample — set PRO_BOOSTERS_B64 for the full set",
      text:
        "\n\n# Role\nAct as a top-tier specialist in this exact task; anticipate edge cases and prefer concrete specifics over generic advice.",
    },
  ],
  byTemplate: {},
};

/** Edge-safe base64 → UTF-8 (no Node Buffer; works in the edge runtime). */
function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

let cache: BoosterData | null = null;

function load(): BoosterData {
  if (cache) return cache;
  const raw = process.env.PRO_BOOSTERS_B64;
  if (!raw) return (cache = SAMPLE);
  try {
    const parsed = JSON.parse(decodeBase64Utf8(raw)) as Partial<BoosterData>;
    cache = {
      global: Array.isArray(parsed.global) ? parsed.global : [],
      byTemplate:
        parsed.byTemplate && typeof parsed.byTemplate === "object" ? parsed.byTemplate : {},
    };
    return cache;
  } catch {
    return (cache = SAMPLE);
  }
}

/** Boosters for a template: its tailored set (if any) followed by the global set. */
export function getBoosters(templateId?: string): Booster[] {
  const { global, byTemplate } = load();
  const tailored = templateId ? byTemplate[templateId] ?? [] : [];
  return [...tailored, ...global];
}
