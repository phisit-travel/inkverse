import { revalidateTag } from "next/cache";

// Bust the caches that show a story's chapter list the moment a chapter is
// created, published, edited, or deleted — so creators see their work appear
// immediately instead of waiting out the cache TTL.
export function revalidateMangaCache(slug: string) {
  // "max" = supported stale-while-revalidate purge (Next 16). The next visit
  // serves the refreshed list instead of waiting out the 120s/300s TTL.
  revalidateTag(`manga:${slug}`, "max"); // the /content/<slug> chapter list
  revalidateTag("home-feed", "max"); // the home "latest updates" feed
}
