/* Unified browse-item model: one shape per object type that both first-party
 * ("house") and user-published ("community") items normalize into, so the browse
 * pages render a single mixed grid with one sort/filter pipeline. Pure types. */

import type { IconName } from "@/components/iconNames";
import type { CommunityAuthor } from "@/lib/community/map";

export type Origin = "house" | "community";

/** Who made an item. House = first-party ("EasyPrompt"); community = an author
 *  (null when the author has no username). */
export type Creator = { kind: "house" } | { kind: "community"; author: CommunityAuthor | null };

export type PromptMetricKind = "example_prompt" | "user_prompt";
export type TemplateMetricKind = "catalog" | "user_template";

export type BrowsePromptItem = {
  key: string;
  origin: Origin;
  /** Metric key + identity (catalog slug or share slug). */
  slug: string;
  href: string;
  /** The `<x>.md` filename shown as the card heading. */
  fileName: string;
  /** Human title (search + aria-label). */
  title: string;
  blurb: string;
  tag: string;
  category: string | null;
  metricKind: PromptMetricKind;
  /** Full body when known up-front (house). Community resolves it lazily on Copy. */
  body: string | null;
  bookmark: { kind: "example_prompt"; key: string } | null;
  creator: Creator;
  /** Sort recency in each origin's own scale (house = authored ordinal; community
   *  = created_at epoch ms). Compared only within an origin bucket. */
  recency: number;
  popular: boolean;
};

export type BrowseTemplateItem = {
  key: string;
  origin: Origin;
  slug: string;
  href: string;
  title: string;
  blurb: string;
  icon: IconName;
  tag: string;
  category: string | null;
  metricKind: TemplateMetricKind;
  popular: boolean;
  /** House only — community templates carry neither. */
  questionCount: number | null;
  showRating: boolean;
  bookmark: { kind: "catalog"; key: string } | null;
  creator: Creator;
  recency: number;
};
