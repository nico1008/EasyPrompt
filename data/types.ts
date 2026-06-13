import type { IconName } from "@/components/Icon";

/* Field schema — covers every control seen across the design screens:
   text / textarea (free input), select (native dropdown), pills (single-select). */
export type TextField = {
  id: string;
  type: "text" | "textarea";
  label: string;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  /** Prepended to the answer when assembling the prompt. */
  prefix: string;
  default?: string;
};

export type ChoiceField = {
  id: string;
  type: "select" | "pills";
  label: string;
  helper?: string;
  required?: boolean;
  options: string[];
  prefix: string;
  default?: string;
};

export type Field = TextField | ChoiceField;

export type Checkbox = {
  id: string;
  label: string;
  sub?: string;
  /** Appended verbatim when the box is checked. */
  injected_text: string;
  default?: boolean;
};

export type Template = {
  id: string;
  slug: string;
  /** Canonical category id (see CATEGORIES). */
  category: string;
  /** Short label shown on the picker card tag. */
  tag: string;
  icon: IconName;
  seo_title: string;
  seo_description: string;
  /** One-sentence card description. */
  blurb: string;
  /** Short intro under the builder title. */
  intro: string;
  /** Mono usage meta, e.g. "12.4k". */
  uses: string;
  popular?: boolean;
  /** Recency rank for the "New" sort (higher = newer). */
  added?: number;
  base_prompt: string;
  fields: Field[];
  checkboxes: Checkbox[];
};

export type Category = {
  id: string;
  label: string;
  emoji: string;
};
