import { headers } from "next/headers";

/**
 * True when the current request comes from the native Android app (Capacitor
 * WebView) rather than a normal browser. The WebView's User-Agent carries an
 * "INKVERSE" marker (see lib/deviceSessions parseDevice); some client fetches
 * also set the `x-inkverse-app` header.
 *
 * Used to hide ADULT (18+) content from the APP's feeds/lists for Google Play
 * compliance, while the website shows it (with an 18+ badge + age gate). The
 * root layout already calls auth(), so every route is dynamic — reading headers
 * here adds no extra rendering cost.
 */
export async function isAppRequest(): Promise<boolean> {
  try {
    const h = await headers();
    if (h.get("x-inkverse-app") === "1") return true;
    return /INKVERSE/i.test(h.get("user-agent") || "");
  } catch {
    return false;
  }
}

/**
 * Prisma `where` fragment to exclude 18+ works. Spread into a query when the
 * caller wants to hide ADULT (the app), `{}` (no filter) on the web.
 *   where: { ...listedMangaWhere(), ...hideAdultWhen(isApp) }
 */
export function hideAdultWhen(hide: boolean) {
  return hide ? { contentRating: { not: "ADULT" as const } } : {};
}
