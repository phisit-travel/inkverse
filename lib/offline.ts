// Client-side offline library: explicitly save a chapter for fully-offline
// reading. Manga page images and novel illustrations go into a persistent Cache
// ("ink-downloads", which the service worker reads first and never auto-evicts);
// the chapter (incl. novel HTML text) is remembered in localStorage. Only
// meaningful inside the app (where the SW is registered).

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
  type: "manga" | "novel";
  savedAt: number;
  // manga
  pages?: OfflinePage[];
  // novel
  html?: string;
  chapterTitle?: string | null;
  minutes?: number;
  authorNote?: string | null;
  imgUrls?: string[];
}

// Master switch for the whole offline feature (button visibility etc.). Flip to
// false to instantly hide it everywhere if the service worker must be disabled.
export const OFFLINE_ENABLED = true;

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

function put(list: OfflineChapter[], entry: OfflineChapter) {
  const next = list.filter((d) => d.chapterId !== entry.chapterId);
  next.unshift(entry);
  save(next);
}

const idOf = (src: string) => (src.match(/\/api\/img\/([^?]+)/) || [])[1];

// ── Manga: fetch every page image, keyed by id only (survives signature rotation). ──
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
    const res = await fetch(p.src);
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
  put(getDownloads(), { ...meta, type: "manga", pages: saved, savedAt: Date.now() });
}

// ── Novel: store the HTML text + best-effort cache embedded illustrations. ──
export async function downloadNovel(meta: {
  chapterId: string;
  mangaSlug: string;
  chapterNum: number;
  mangaTitle: string;
  html: string;
  chapterTitle?: string | null;
  minutes?: number;
  authorNote?: string | null;
}): Promise<void> {
  const cache = await caches.open(CACHE);
  const imgUrls = Array.from(meta.html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).map((m) => m[1]);
  await Promise.all(
    imgUrls.map(async (u) => {
      try {
        // no-cors → opaque response (R2 public bucket needs no CORS); still
        // cacheable + displayable in an <img> offline.
        const res = await fetch(u, { mode: "no-cors" });
        await cache.put(u, res);
      } catch {
        /* leave it — text still reads offline */
      }
    })
  );
  put(getDownloads(), {
    chapterId: meta.chapterId,
    mangaSlug: meta.mangaSlug,
    chapterNum: meta.chapterNum,
    mangaTitle: meta.mangaTitle,
    type: "novel",
    html: meta.html,
    chapterTitle: meta.chapterTitle ?? null,
    minutes: meta.minutes,
    authorNote: meta.authorNote ?? null,
    imgUrls,
    savedAt: Date.now(),
  });
}

// Fetch a chapter's content from the (access-controlled) API and save it. Used by
// the bulk "download chapters" picker on the manga page.
export async function downloadById(
  id: string,
  onPageProgress?: (done: number, total: number) => void
): Promise<void> {
  const res = await fetch(`/api/chapters/${id}/offline-pages`);
  if (!res.ok) throw new Error("fetch-failed");
  const data = await res.json();
  if (data.type === "novel") {
    await downloadNovel({
      chapterId: data.chapterId,
      mangaSlug: data.mangaSlug,
      chapterNum: data.chapterNum,
      mangaTitle: data.mangaTitle,
      html: data.html,
      chapterTitle: data.chapterTitle,
      minutes: data.minutes,
      authorNote: data.authorNote,
    });
  } else {
    await downloadChapter(
      {
        chapterId: data.chapterId,
        mangaSlug: data.mangaSlug,
        chapterNum: data.chapterNum,
        mangaTitle: data.mangaTitle,
      },
      data.pages,
      onPageProgress
    );
  }
}

export async function removeDownload(chapterId: string): Promise<void> {
  const list = getDownloads();
  const target = list.find((d) => d.chapterId === chapterId);
  if (target) {
    const cache = await caches.open(CACHE);
    const keys = [
      ...(target.pages ?? []).map((pg) => `/api/img/${pg.id}`),
      ...(target.imgUrls ?? []),
    ];
    await Promise.all(keys.map((k) => cache.delete(k)));
  }
  save(list.filter((d) => d.chapterId !== chapterId));
}
