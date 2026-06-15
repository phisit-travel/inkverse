// In this Next version, dynamic params in a NON-leaf segment (e.g. the [slug]
// in /dashboard/manga/[slug]/write or /content/[slug]/[chapter]) are NOT
// URL-decoded, unlike a leaf [slug] (e.g. /content/[slug]). Thai slugs then
// arrive percent-encoded and miss DB lookups → 404 a real record. Decode
// defensively; a no-op for already-decoded or ASCII slugs.
export function decodeSlug(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // malformed % sequence — use as-is
  }
}
