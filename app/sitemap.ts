import type { MetadataRoute } from "next";
import { TEMPLATES } from "@/data/templates";

const SITE = "https://easyprompt.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/prompts`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/how-it-works`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/pricing`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/submit-template`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const templatePages: MetadataRoute.Sitemap = TEMPLATES.map((t) => ({
    url: `${SITE}/prompts/${t.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticPages, ...templatePages];
}
