import { MetadataRoute } from "next";

const BASE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://inksverse.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/upload", "/dashboard", "/api/", "/auth/", "/topup/checkout", "/settings", "/topup/processing", "/topup/success", "/downloads", "/offline"],
      },
      {
        // Block AI training crawlers from the whole site.
        userAgent: ["GPTBot", "CCBot", "Google-Extended", "anthropic-ai", "ClaudeBot"],
        disallow: ["/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    // No `host:` — non-standard (Yandex) directive Google ignores; emitting it
    // only risks a Search Console parser warning. Canonical host is handled by
    // the www→apex redirect in proxy.ts + per-page canonical tags.
  };
}
