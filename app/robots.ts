import type { MetadataRoute } from "next";

const SITE = "https://easyprompt.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private account areas + auth routes stay out of the index.
      disallow: [
        "/api/",
        "/my",
        "/account",
        "/settings",
        "/auth/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
