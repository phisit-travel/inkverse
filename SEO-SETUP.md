# INKVERSE SEO Setup

## What's implemented in code

- `app/sitemap.ts` → `/sitemap.xml` (static pages + every genre + every manga)
- `app/robots.ts` → `/robots.txt` (blocks /admin, /upload, /dashboard, /api, /auth, checkout; blocks AI crawlers)
- Rich metadata: root layout, manga detail, reader, and discover pages (title template, OG, Twitter, canonical, hreflang th-TH)
- JSON-LD structured data: `WebSite` + `SearchAction` (all pages), `Book` + `AggregateRating` and `BreadcrumbList` (manga pages) — `components/seo/JsonLd.tsx`
- Dynamic OG images: `app/opengraph-image.tsx` (home) and `app/content/[slug]/opengraph-image.tsx` (per manga, with cover + Thai font)
- Performance: AVIF/WebP, responsive image sizes, 30-day image cache, `compress`, immutable static cache, `no-store` on APIs, `/home → /` redirect

> Canonical/OG/sitemap URLs use `SITE_URL` (falling back to `NEXTAUTH_URL`). Set `SITE_URL` to your real domain (e.g. `https://inkverse-tau.vercel.app`) — `NEXTAUTH_URL` stays `http://localhost:3000` for local auth. In production set both `SITE_URL` and `NEXTAUTH_URL` to the real domain.

## After deploying, do these once

### 1. Google Search Console
1. https://search.google.com/search-console → Add property → URL prefix → your domain
2. Choose **HTML tag** verification → copy the `content="..."` value
3. Set `GOOGLE_SITE_VERIFICATION=<that value>` in your host's env → redeploy
4. Click **Verify**
5. Sitemaps → submit `sitemap.xml`

### 2. Bing Webmaster Tools
1. https://www.bing.com/webmasters → Import from Google Search Console
2. Submit `https://<domain>/sitemap.xml`

### 3. Test
- Sitemap: `https://<domain>/sitemap.xml`
- Robots: `https://<domain>/robots.txt`
- Rich results: https://search.google.com/test/rich-results
- PageSpeed: https://pagespeed.web.dev
- OG preview: https://www.opengraph.xyz

### 4. Monitor monthly
- Search Console → Performance (which titles rank), Core Web Vitals, Coverage (indexing errors)

## Deviations from the original spec (intentional, for this codebase)
- Paths use `app/` (no `src/`); `prisma` is a **named** import.
- `next.config` was **merged**, not replaced — kept the security headers + the real R2 image host (`**.r2.dev`, not `r2.cloudflarestorage.com`).
- OG image routes use `runtime = "nodejs"` (Prisma's pg adapter is not edge-safe).
- Skipped `generateStaticParams`/ISR on the manga detail page — it's dynamic (increments views + reads cookies per request).
- Did not auto-run `vercel --prod` — deploy yourself when ready.
