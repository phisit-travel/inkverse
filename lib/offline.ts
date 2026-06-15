// Client-side offline library: explicitly download a chapter's page images into
// a persistent Cache ("ink-downloads", which the service worker reads first and
// never auto-evicts) and remember the chapter in localStorage so it can be read
// fully offline. Only meaningful inside the app (where the SW is registered).

export interface OfflinePage {
  id: string;
  w: number;
  h: number;
}

export interface OfflineChapter {
  chapterId: string;
  mangaSlug: string;
  chapterNum: number;
  mangaTitle: string;
  pages: OfflinePage[];
  savedAt: number;
}

const KEY = "ink-downloads-v1";
const CACHE = "ink-downloads";

export function getDownloads(): OfflineChapter[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function isDownloaded(chapterId: string): boolean {
  return getDownloads().some((d) => d.chapterId === chapterId);
}

function save(list: OfflineChapter[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

const idOf = (src: string) => (src.match(/\/api\/img\/([^?]+)/) || [])[1];

// Fetch every page image and store it under its id-only key so it survives the
// signature rotating and is served offline by the SW.
export async function downloadChapter(
  meta: { chapterId: string; mangaSlug: string; chapterNum: number; mangaTitle: string },
  pages: { src: string; width?: number | null; height?: number | null }[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const cache = await caches.open(CACHE);
  const saved: OfflinePage[] = [];
  let done = 0;
  for (const p of pages) {
    const id = idOf(p.src);
    if (!id) continue;
    const res = await fetch(p.src); // signed URL → 302 → R2 image
    if (!res.ok) throw new Error("download-failed");
    const body = await res.blob();
    const clean = new Response(body, {
      status: 200,
      headers: { "Content-Type": res.headers.get("Content-Type") || "image/webp" },
    });
    await cache.put(`/api/img/${id}`, clean);
    saved.push({ id, w: p.width || 800, h: p.height || 1200 });
    onProgress?.(++done, pages.length);
  }
  if (!saved.length) throw new Error("no-pages");
  const list = getDownloads().filter((d) => d.chapterId !== meta.chapterId);
  list.unshift({ ...meta, pages: saved, savedAt: Date.now() });
  save(list);
}

export async function removeDownload(chapterId: string): Promise<void> {
  const list = getDownloads();
  const target = list.find((d) => d.chapterId === chapterId);
  if (target) {
    const cache = await caches.open(CACHE);
    await Promise.all(target.pages.map((pg) => cache.delete(`/api/img/${pg.id}`)));
  }
  save(list.filter((d) => d.chapterId !== chapterId));
}
