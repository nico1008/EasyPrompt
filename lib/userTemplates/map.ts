/* Hydrate a user_templates DB row into the catalog `Template` shape, so the
 * existing Builder + buildPrompt run on a user template unchanged. Pure — no
 * server-only imports — so it's usable on the server and in tests. */

import type { Database } from "@/lib/supabase/types";
import type { Template, Field, Checkbox } from "@/data/types";
import type { IconName } from "@/components/iconNames";

export type UserTemplateRow = Database["public"]["Tables"]["user_templates"]["Row"];

export function rowToTemplate(row: UserTemplateRow): Template {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    category: row.category,
    tag: row.tag ?? "",
    icon: row.icon as IconName,
    seo_title: row.title,
    seo_description: row.blurb ?? "",
    blurb: row.blurb ?? "",
    intro: row.intro ?? "",
    uses: "",
    base_prompt: row.base_prompt,
    fields: (row.fields as unknown as Field[]) ?? [],
    checkboxes: (row.checkboxes as unknown as Checkbox[]) ?? [],
  };
}
