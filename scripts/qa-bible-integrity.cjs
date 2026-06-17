// Story Bible data-integrity test — make sure saved entries never silently
// vanish. Covers: create-all-categories, survive UI reload, edit, long/Thai/
// special-char round-trip, empty body, delete-isolation, and cross-owner
// protection (another translator can't read or wipe your bible).
// Env: QA_EMAIL/QA_PASS (translator A) + QA2_EMAIL/QA2_PASS (translator B).
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const TS = Date.now();
const SLUG = "qa-bible-" + TS;
const TITLE = "ทดสอบ QA Bible " + TS;

const problems = [];
const steps = [];
const ok = (s) => { steps.push("  ✅ " + s); console.log("✅ " + s); };
const bad = (s) => { problems.push(s); steps.push("  ❌ " + s); console.log("❌ " + s); };

async function login(ctx, page, email, pass) {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  for (let i = 0; i < 40; i++) { if ((await ctx.cookies()).some((c) => c.name.includes("session-token") && c.value)) return true; await page.waitForTimeout(500); }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const enc = encodeURIComponent;
  const base = (slug) => `${BASE}/api/manga/${enc(slug)}/bible`;
  let slug = SLUG;

  try {
    if (!(await login(ctx, page, process.env.QA_EMAIL, process.env.QA_PASS))) { bad("login A failed"); throw new Error("login"); }
    ok("login translator A");

    const mk = await page.request.post(`${BASE}/api/manga`, { data: { title: TITLE, slug: SLUG, description: "story bible integrity test", type: "MANHWA" } });
    slug = (await mk.json().catch(() => ({}))).slug || SLUG;
    ok(`manga created (${slug})`);

    // 1. create one entry per category
    const longBody = "ก".repeat(19000); // near the 20k cap
    const cats = [
      { category: "GLOSSARY", title: "Arin", body: "อาริน — ใช้ทุกตอน" },
      { category: "CHARACTER", title: "ตัวละครเอก", body: 'นิสัย "กล้าหาญ"\nบรรทัด2\n😀 emoji & <tag>' },
      { category: "WORLD", title: "เมืองเวล", body: "เมืองท่าเหนือ" },
      { category: "TIMELINE", title: "สงครามครั้งที่ 1", body: "ปีที่ 200" },
      { category: "NOTE", title: "โน้ตยาว", body: longBody },
    ];
    const ids = {};
    for (const c of cats) {
      const r = await page.request.post(base(slug), { data: c });
      const j = await r.json().catch(() => ({}));
      if (r.ok() && j.id) { ids[c.category] = j.id; } else bad(`create ${c.category} failed (${r.status()})`);
    }
    Object.keys(ids).length === 5 ? ok("created entries in all 5 categories") : bad(`only ${Object.keys(ids).length}/5 created`);

    // 2. read back — all present, fields intact (round-trip)
    const after = await (await page.request.get(base(slug))).json().catch(() => []);
    const byId = Object.fromEntries((after || []).map((e) => [e.id, e]));
    after.length === 5 ? ok("GET returns all 5 entries") : bad(`GET returned ${after.length}/5`);
    // round-trip checks
    const charEntry = byId[ids.CHARACTER];
    charEntry && charEntry.body.includes('"กล้าหาญ"') && charEntry.body.includes("😀") && charEntry.body.includes("<tag>") && charEntry.body.includes("\n")
      ? ok("special chars / emoji / newlines / quotes preserved") : bad(`char entry mangled: ${JSON.stringify(charEntry?.body)}`);
    const noteEntry = byId[ids.NOTE];
    noteEntry && noteEntry.body.length === 19000 ? ok("long body (19k chars) stored in full") : bad(`long body truncated to ${noteEntry?.body?.length}`);
    const gloss = byId[ids.GLOSSARY];
    gloss && gloss.category === "GLOSSARY" ? ok("GLOSSARY category persisted correctly") : bad(`glossary category wrong: ${gloss?.category}`);

    // 3. survive a real UI reload — the UI shows one category tab at a time,
    //    so click through each tab and confirm its entry is there.
    await page.goto(`${BASE}/dashboard/manga/${enc(slug)}/bible`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const tabs = [
      ["คำแปล/ชื่อ", "Arin"],
      ["ตัวละคร", "ตัวละครเอก"],
      ["โลก & สถานที่", "เมืองเวล"],
      ["ไทม์ไลน์", "สงครามครั้งที่ 1"],
      ["โน้ตอื่นๆ", "โน้ตยาว"],
    ];
    let allFound = true;
    for (const [tab, title] of tabs) {
      await page.evaluate((label) => {
        const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.replace(/\s+/g, " ").trim().startsWith(label));
        if (btn) btn.click();
      }, tab);
      await page.waitForTimeout(300);
      const shown = (await page.locator("body").innerText()).includes(title);
      if (!shown) { allFound = false; bad(`reload: "${title}" missing in tab "${tab}"`); }
    }
    if (allFound) ok("all 5 entries present across tabs after UI reload (no data loss)");

    // 4. edit one — persists; others untouched
    const ed = await page.request.patch(`${base(slug)}/${ids.WORLD}`, { data: { title: "เมืองเวล (แก้ไข)", body: "อัปเดตรายละเอียด" } });
    ed.ok() ? ok("edit (PATCH) ok") : bad(`edit failed (${ed.status()})`);
    const after2 = await (await page.request.get(base(slug))).json().catch(() => []);
    const w = after2.find((e) => e.id === ids.WORLD);
    w && w.title === "เมืองเวล (แก้ไข)" && w.body === "อัปเดตรายละเอียด" ? ok("edit persisted") : bad("edit not persisted");
    after2.length === 5 ? ok("edit didn't drop other entries (still 5)") : bad(`count changed after edit: ${after2.length}`);

    // 5. empty body keeps title (no accidental wipe of the whole entry)
    await page.request.patch(`${base(slug)}/${ids.GLOSSARY}`, { data: { title: "Arin", body: "" } });
    const g2 = (await (await page.request.get(base(slug))).json()).find((e) => e.id === ids.GLOSSARY);
    g2 && g2.title === "Arin" && (g2.body === null || g2.body === "") ? ok("clearing body keeps the entry + title") : bad("entry damaged after empty body");

    // 6. delete one — only that one goes
    const del = await page.request.delete(`${base(slug)}/${ids.TIMELINE}`);
    del.ok() ? ok("delete ok") : bad(`delete failed (${del.status()})`);
    const after3 = await (await page.request.get(base(slug))).json().catch(() => []);
    after3.length === 4 && !after3.some((e) => e.id === ids.TIMELINE) ? ok("delete removed only the target (4 left, rest intact)") : bad(`delete wrong: ${after3.length} left`);

    // 7. cross-owner isolation — translator B must not read/edit/delete A's bible
    if (process.env.QA2_EMAIL) {
      const b2 = await chromium.launch();
      try {
        const ctx2 = await b2.newContext();
        const p2 = await ctx2.newPage();
        if (await login(ctx2, p2, process.env.QA2_EMAIL, process.env.QA2_PASS)) {
          const rGet = await p2.request.get(base(slug));
          rGet.status() === 403 || rGet.status() === 404 ? ok(`other translator GET blocked (${rGet.status()})`) : bad(`other translator could READ bible (${rGet.status()})!`);
          const rPatch = await p2.request.patch(`${base(slug)}/${ids.CHARACTER}`, { data: { title: "HACKED" } });
          rPatch.status() >= 400 ? ok(`other translator PATCH blocked (${rPatch.status()})`) : bad("other translator could EDIT bible!");
          const rDel = await p2.request.delete(`${base(slug)}/${ids.CHARACTER}`);
          rDel.status() >= 400 ? ok(`other translator DELETE blocked (${rDel.status()})`) : bad("other translator could DELETE bible!");
          // confirm A's data still intact after B's attempts
          const finalA = await (await page.request.get(base(slug))).json().catch(() => []);
          const ch = finalA.find((e) => e.id === ids.CHARACTER);
          ch && ch.title === "ตัวละครเอก" ? ok("A's data intact after B's attack") : bad("A's data altered by B!");
        } else { console.log("  (skipped isolation — B login failed)"); }
      } finally { await b2.close(); }
    }

    // cleanup
    await page.request.delete(`${BASE}/api/manga/${enc(slug)}`);
  } catch (e) {
    bad("EXCEPTION: " + String(e).slice(0, 200));
  } finally {
    await browser.close();
  }

  console.log("\n===== STORY BIBLE INTEGRITY REPORT =====");
  steps.forEach((s) => console.log(s));
  console.log(`\n${problems.length === 0 ? "🟢 ALL CLEAN — no data loss" : "🔴 " + problems.length + " PROBLEM(S)"}`);
  if (problems.length) { console.log("\n--- problems ---"); [...new Set(problems)].forEach((p) => console.log(" • " + p)); }
  process.exit(problems.length ? 1 : 0);
})();
