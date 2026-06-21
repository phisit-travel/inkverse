// ── Layer-1 rule examples / lightweight test harness ─────────────────────────
// No test runner is wired in this repo, so this exports `examples` AND can be
// run directly:  npx tsx lib/thaiSpellcheck/rules.test-examples.ts
//
// Each example asserts the SET of issue `type`s produced for an input (order-
// independent). Correct text → []. Each error type → its expected type code.

import { checkThaiRules } from "./rules";

export type Example = {
  name: string;
  text: string;
  expectTypes: string[]; // multiset of issue.type expected (sorted-compared)
};

export const examples: Example[] = [
  // ── clean text → no issues ──────────────────────────────────────────────
  { name: "clean sentence", text: "เธอเดินเข้ามาในห้องอย่างเงียบ ๆ", expectTypes: [] },
  { name: "clean with normal tone", text: "เขาพูดว่าไม่เป็นไรนะคะ", expectTypes: [] },
  { name: "empty", text: "", expectTypes: [] },

  // ── rule 1: double / stacked tone marks ─────────────────────────────────
  { name: "double tone same", text: "ก่่า", expectTypes: ["double-tone"] }, // ◌่◌่
  { name: "double tone different", text: "ก้่า", expectTypes: ["double-tone"] }, // ◌้◌่

  // ── rule 2: duplicate same diacritic ────────────────────────────────────
  { name: "dup above vowel ◌ิ", text: "กิิน", expectTypes: ["duplicate-diacritic"] },
  { name: "dup above vowel ◌ี", text: "มีี", expectTypes: ["duplicate-diacritic"] },
  { name: "dup below vowel ◌ุ", text: "ดุุ", expectTypes: ["duplicate-diacritic"] },

  // ── rule 3: two different above-vowels adjacent ─────────────────────────
  { name: "two above vowels", text: "กิีน", expectTypes: ["double-above-vowel"] }, // ◌ิ◌ี

  // ── rule 4: orphan / floating diacritic ─────────────────────────────────
  { name: "orphan tone at start", text: "่ไป", expectTypes: ["orphan-diacritic"] },
  { name: "orphan after space", text: "ไป ้มา", expectTypes: ["orphan-diacritic"] },
  { name: "orphan karan after space", text: "คน ์", expectTypes: ["orphan-diacritic"] },

  // ── rule 5: นะค่ะ → นะคะ ─────────────────────────────────────────────────
  { name: "na-kha particle", text: "ขอบคุณนะค่ะ", expectTypes: ["ka-kha"] },

  // ── rule 6: repeated word (warn) ────────────────────────────────────────
  { name: "repeated word", text: "เขาเดินเดินไป", expectTypes: ["repeat-word"] },
  { name: "repeated word w/ space", text: "มาก มาก เลย", expectTypes: ["repeat-word"] },

  // ── rule 7: multiple spaces (warn) ──────────────────────────────────────
  { name: "double space", text: "คำ  ต่อมา", expectTypes: ["multi-space"] },

  // ── rule 8: leading-vowel misuse (warn) ─────────────────────────────────
  { name: "leading vowel orphan", text: "เ ไป", expectTypes: ["leading-vowel"] },
];

// ── runnable checker (returns pass/fail per example) ─────────────────────────
export function runExamples() {
  const results = examples.map((ex) => {
    const got = checkThaiRules(ex.text)
      .map((i) => i.type)
      .sort();
    const want = [...ex.expectTypes].sort();
    const pass = got.length === want.length && got.every((t, k) => t === want[k]);
    return { name: ex.name, pass, got, want };
  });
  return { results, passed: results.filter((r) => r.pass).length, total: results.length };
}

// Direct-run entry (tsx / ts-node). Harmless when imported.
declare const require: unknown;
declare const module: unknown;
if (typeof require !== "undefined" && typeof module !== "undefined") {
  // @ts-expect-error CJS guard for direct execution only
  if (require.main === module) {
    const { results, passed, total } = runExamples();
    for (const r of results) {
      // eslint-disable-next-line no-console
      console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}` + (r.pass ? "" : `  got=[${r.got}] want=[${r.want}]`));
    }
    // eslint-disable-next-line no-console
    console.log(`\n${passed}/${total} passed`);
  }
}
