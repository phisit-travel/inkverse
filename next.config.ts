import type { NextConfig } from "next";

// Security response headers applied to every route.
const securityHeaders = [
  // Force HTTPS for 2 years (ignored by browsers on plain http, e.g. localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Block this site from being framed (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let browsers MIME-sniff responses.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop powerful browser features we don't use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Content Security Policy. 'unsafe-inline'/'unsafe-eval' are required by
  // Next.js' inline bootstrap + Turbopack; the value still locks down which
  // *external* origins may load scripts, connect, or frame us.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://accounts.google.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.omise.co",
      "frame-src 'self' https://cdn.omise.co",
      "connect-src 'self' https://api.omise.co https://vault.omise.co https://developer.easyslip.com https://api.easyslip.com",
    ].join("; "),
  },
];

// Tell search engines NOT to index private/transactional/app-only routes.
// This is a response-header fix so it also covers client-component pages that
// can't export `metadata` (which would otherwise inherit the root layout's
// `robots: { index: true }`).
const noindexHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

// Source patterns for routes that must NOT be indexed. Patterns are precise so
// they never catch the indexable siblings (e.g. /topup landing, /download
// marketing page) — see the keep-indexable list in the SEO audit.
const noindexSources = [
  "/dashboard",
  "/dashboard/:path*",
  "/admin",
  "/admin/:path*",
  "/auth/:path*",
  "/settings",
  "/upload",
  "/topup/checkout/:path*",
  "/topup/processing/:path*",
  "/topup/success/:path*",
  "/downloads",
  "/offline",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  images: {
    // Only proxy/optimize images from hosts we actually use — not the whole web.
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "media.anilist.co" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 64, 96, 128, 256, 300],
    minimumCacheTTL: 2592000, // 30 days
  },
  compress: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // APIs must never be cached by shared caches.
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        // Hashed build assets are immutable.
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=43200" },
        ],
      },
      // Keep private/transactional/app-only routes out of search indexes.
      ...noindexSources.map((source) => ({ source, headers: noindexHeaders })),
    ];
  },
  async redirects() {
    return [{ source: "/home", destination: "/", permanent: true }];
  },
};

export default nextConfig;
