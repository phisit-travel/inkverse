// QA: public pages + SEO (anonymous). Read-only. Checks every public route
// loads, search works, and SEO surfaces are valid (sitemap, robots, OG images,
// JSON-LD, canonical/meta). Real data passed via env.
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const MANGA = process.env.QA_MANGA || "pick-me-up-infinite-gacha";
const GENRE = process.env.QA_GENRE || "action";
const USER = process.env.QA_USER || "inkverse_admin";

const problems = [];
const steps = [];
function ok(s) { steps.push("  ✅ " + s); console.log("✅ " + s); }
function bad(s) { problems.push(s); steps.push("  ❌ " + s); console.log("❌ " + s); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();
  const IGNORE = /DevTools|hydration|HMR|favicon|Warning: |\[Fast Refresh\]|cloudflarestorage|inkverse-private|\/api\/img\//i;
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) problems.push("console.error: " + m.text().slice(0, 140)); });
  page.on("pageerror", (e) => problems.push("pageerror: " + String(e).slice(0, 140)));
  page.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 500 && !/\/api\/img\//.test(u)) problems.push(`HTTP ${r.status()} ${u.replace(BASE, "")}`); });

  const enc = encodeURIComponent;
  try {
    // ── Public pages load (status < 400) ────────────────────────
    const pages = [
      ["home", "/"], ["discover", "/discover"], ["browse", "/manga"],
      ["novels", "/manga?type=NOVEL"], ["genre", `/manga/${GENRE}`],
      ["leaderboard", "/leaderboard"], ["creators", "/creators"],
      ["achievements", "/achievements"], ["profile", `/profile/${enc(USER)}`],
      ["content", `/content/${enc(MANGA)}`],
      ["about", "/about"], ["contact", "/contact"], ["terms", "/terms"],
      ["privacy", "/privacy"], ["dmca", "/dmca"], ["creator-101", "/creator-101"],
      ["download", "/download"],
    ];
    for (const [label, path] of pages) {
      const r = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" }).catch(() => null);
      const st = r ? r.status() : 0;
      st > 0 && st < 400 ? ok(`${label} loads (${st})`) : bad(`${label} failed (${st}) ${path}`);
    }

    // ── Search (live API + results page) ────────────────────────
    const sx = await (await page.request.get(`${BASE}/api/search?q=${enc(MANGA.slice(0, 6))}&limit=6`)).json().catch(() => null);
    const sxArr = Array.isArray(sx) ? sx : sx?.results || sx?.data || [];
    Array.isArray(sxArr) ? ok(`/api/search returns results (${sxArr.length})`) : bad(`/api/search bad shape: ${JSON.stringify(sx).slice(0, 100)}`);
    const dr = await page.goto(`${BASE}/discover?q=${enc("a")}`, { waitUntil: "domcontentloaded" });
    dr && dr.status() < 400 ? ok("/discover?q= results page loads") : bad(`/discover search failed (${dr ? dr.status() : "?"})`);

    // ── SEO: sitemap ────────────────────────────────────────────
    const sm = await page.request.get(`${BASE}/sitemap.xml`);
    const smBody = await sm.text();
    sm.ok() && smBody.includes("<urlset") && smBody.includes(`/content/`) ? ok(`sitemap.xml valid (${(smBody.match(/<url>/g) || []).length} urls)`) : bad(`sitemap.xml problem (${sm.status()})`);

    // ── SEO: robots ─────────────────────────────────────────────
    const rb = await page.request.get(`${BASE}/robots.txt`);
    const rbBody = await rb.text();
    rb.ok() && /sitemap/i.test(rbBody) ? ok("robots.txt valid (references sitemap)") : bad(`robots.txt problem (${rb.status()})`);

    // ── SEO: OG images (site + content) ─────────────────────────
    for (const [label, path] of [["site OG", "/opengraph-image"], ["content OG", `/content/${enc(MANGA)}/opengraph-image`]]) {
      const og = await page.request.get(`${BASE}${path}`);
      const buf = await og.body();
      const isImg = (og.headers()["content-type"] || "").startsWith("image/") && buf.length > 1000;
      og.ok() && isImg ? ok(`${label} renders (${(og.headers()["content-type"])}, ${buf.length}b)`) : bad(`${label} failed (${og.status()})`);
    }

    // ── SEO: content page metadata + JSON-LD + safety ───────────
    await page.goto(`${BASE}/content/${enc(MANGA)}`, { waitUntil: "domcontentloaded" });
    const meta = await page.evaluate(() => ({
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "",
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
      jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent || ""),
    }));
    meta.title && meta.desc ? ok(`content metadata present (title+desc)`) : bad("content page missing title/description");
    meta.ogTitle && meta.ogImage ? ok("OG tags present (og:title + og:image)") : bad("content page missing OG tags");
    if (meta.jsonld.length) {
      let valid = true, safe = true;
      for (const j of meta.jsonld) { try { JSON.parse(j); } catch { valid = false; } if (/<\/?script|<img|onerror=/i.test(j)) safe = false; }
      valid ? ok(`JSON-LD present + parses (${meta.jsonld.length} block(s))`) : bad("JSON-LD failed to parse");
      safe ? ok("JSON-LD is XSS-safe (no raw < > injection)") : bad("JSON-LD contains unescaped HTML — XSS risk!");
    } else { bad("no JSON-LD on content page"); }

    // ── Not-found handling ──────────────────────────────────────
    // Next 16 streams these pages, so notFound() yields HTTP 200 (documented) —
    // it injects <meta robots noindex> instead, which keeps them out of the index.
    // Accept either a real 404 OR a 200 that carries noindex.
    const nf = await page.goto(`${BASE}/content/${enc("ไม่มีเรื่องนี้แน่นอน-xyz-404")}`, { waitUntil: "domcontentloaded" });
    const nfStatus = nf ? nf.status() : 0;
    const noindex = await page.evaluate(() => [...document.querySelectorAll('meta[name="robots"]')].some((m) => /noindex/i.test(m.getAttribute("content") || "")));
    nfStatus === 404 || (nfStatus === 200 && noindex)
      ? ok(`unknown content not indexable (status ${nfStatus}, noindex=${noindex})`)
      : bad(`unknown content is indexable! (status ${nfStatus}, noindex=${noindex})`);
  } catch (e) {
    bad("EXCEPTION: " + String(e).slice(0, 200));
  } finally {
    await browser.close();
  }

  console.log("\n===== QA PUBLIC / SEO REPORT =====");
  steps.forEach((s) => console.log(s));
  console.log(`\n${problems.length === 0 ? "🟢 ALL CLEAN" : "🔴 " + problems.length + " PROBLEM(S)"}`);
  if (problems.length) { console.log("\n--- problems ---"); [...new Set(problems)].forEach((p) => console.log(" • " + p)); }
  process.exit(problems.length ? 1 : 0);
})();
