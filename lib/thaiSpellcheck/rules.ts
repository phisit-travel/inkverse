// ── Thai typo / spell-check rules (LAYER 1) ──────────────────────────────────
// ISOMORPHIC, pure, no Node-only deps — this file runs in the browser (editor)
// AND on the server (API route). Free, no AI, no external API.
//
// Every rule is a small, individually-testable function returning Issue[] with
// precise char offsets into the input string. Rules are intentionally HIGH-
// confidence / low-false-positive: we would rather miss a typo than nag a writer
// about correct prose.
//
// Thai code-point cheat-sheet (used throughout):
//   consonants            ก–ฮ        U+0E01–U+0E2E
//   leading (front) vowels เ แ โ ใ ไ  U+0E40–U+0E44
//   above vowel ◌ั                    U+0E31
//   above vowels ◌ิ ◌ี ◌ึ ◌ื           U+0E34–U+0E37
//   below vowels ◌ุ ◌ู                 U+0E38–U+0E39
//   phinthu ◌ฺ                         U+0E3A
//   ◌็ (mai taikhu)                    U+0E47
//   tone marks ◌่ ◌้ ◌๊ ◌๋             U+0E48–U+0E4B
//   thanthakhat / การันต์ ◌์          U+0E4C
//   nikhahit ◌ํ                        U+0E4D

export type Issue = {
  start: number; // char offset into the input string (inclusive)
  end: number; // char offset (exclusive)
  type: string; // machine code, e.g. "double-tone", "ka-kha", "repeat-word"
  message: string; // Thai, short, shown to writer
  suggestion?: string; // the corrected substring if we can offer one
  severity: "error" | "warn";
};

// ── code-point predicates ────────────────────────────────────────────────────
const isConsonant = (c: string) => c >= "ก" && c <= "ฮ";
const isToneMark = (c: string) => c >= "่" && c <= "๋"; // ่ ้ ๊ ๋
const isAboveVowel = (c: string) =>
  c === "ั" || (c >= "ิ" && c <= "ื"); // ◌ั ◌ิ ◌ี ◌ึ ◌ื
const isBelowVowel = (c: string) => c >= "ุ" && c <= "ู"; // ◌ุ ◌ู
const isKaran = (c: string) => c === "์"; // ◌์
const isPhinthu = (c: string) => c === "ฺ"; // ◌ฺ
const isMaiTaikhu = (c: string) => c === "็"; // ◌็
const isNikhahit = (c: string) => c === "ํ"; // ◌ํ
const isLeadingVowel = (c: string) => c >= "เ" && c <= "ไ"; // เ แ โ ใ ไ

// "Combining" marks that legally attach ABOVE/BELOW a base consonant. A floating
// one of these (rule 4) is almost certainly a typo.
const isAboveBelowMark = (c: string) =>
  isToneMark(c) ||
  isAboveVowel(c) ||
  isBelowVowel(c) ||
  isKaran(c) ||
  isPhinthu(c) ||
  isMaiTaikhu(c) ||
  isNikhahit(c);

// ── Rule 1: double / stacked tone marks ──────────────────────────────────────
// Two (or more) tone marks (◌่◌้◌๊◌๋) in a row → keep the first, drop the rest.
export function checkDoubleTone(text: string): Issue[] {
  const out: Issue[] = [];
  let i = 0;
  while (i < text.length) {
    if (isToneMark(text[i])) {
      let j = i + 1;
      while (j < text.length && isToneMark(text[j])) j++;
      if (j - i >= 2) {
        out.push({
          start: i,
          end: j,
          type: "double-tone",
          message: "วรรณยุกต์ซ้อนกัน",
          suggestion: text[i],
          severity: "error",
        });
      }
      i = j;
    } else i++;
  }
  return out;
}

// ── Rule 2: duplicate same diacritic ─────────────────────────────────────────
// The SAME above/below vowel repeated consecutively (◌ิ◌ิ, ◌ี◌ี, ◌ุ◌ุ). Collapse
// to one. Tone-mark adjacency (◌่◌่ etc.) is owned entirely by rule 1
// (checkDoubleTone) so we exclude tone marks here to avoid double-reporting.
export function checkDuplicateDiacritic(text: string): Issue[] {
  const out: Issue[] = [];
  const dup = (c: string) => isAboveVowel(c) || isBelowVowel(c);
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (dup(c) && text[i + 1] === c) {
      let j = i + 1;
      while (text[j] === c) j++;
      out.push({
        start: i,
        end: j,
        type: "duplicate-diacritic",
        message: "สระ/วรรณยุกต์ซ้ำ",
        suggestion: c,
        severity: "error",
      });
      i = j;
    } else i++;
  }
  return out;
}

// ── Rule 3: two above-vowels adjacent ────────────────────────────────────────
// Two DIFFERENT above-vowels in a row can't legally combine (e.g. ◌ิ◌ี). Same-
// char repeats are rule 2, so we only flag distinct pairs here.
export function checkTwoAboveVowels(text: string): Issue[] {
  const out: Issue[] = [];
  for (let i = 0; i + 1 < text.length; i++) {
    const a = text[i];
    const b = text[i + 1];
    if (isAboveVowel(a) && isAboveVowel(b) && a !== b) {
      out.push({
        start: i,
        end: i + 2,
        type: "double-above-vowel",
        message: "สระบนซ้อนกันไม่ถูกต้อง",
        severity: "error",
      });
    }
  }
  return out;
}

// ── Rule 4: orphan / floating diacritic ──────────────────────────────────────
// A tone mark / above|below vowel / การันต์ / phinthu / ◌็ / nikhahit that is NOT
// immediately preceded by a Thai consonant (start of string, after a space, or
// after a non-consonant char). High-confidence broken cluster.
// NOTE: runs of identical/stacked marks are handled by rules 1–2; here we only
// look at the FIRST mark of any cluster so we don't double-report.
export function checkOrphanDiacritic(text: string): Issue[] {
  const out: Issue[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!isAboveBelowMark(c)) continue;
    const prev = text[i - 1];
    // If the previous char is itself a mark, this is part of a stack the other
    // rules own — skip to avoid double-flagging.
    if (prev !== undefined && isAboveBelowMark(prev)) continue;
    if (prev !== undefined && isConsonant(prev)) continue; // legal attachment
    out.push({
      start: i,
      end: i + 1,
      type: "orphan-diacritic",
      message: "สระ/วรรณยุกต์ลอย (ไม่มีพยัญชนะนำหน้า)",
      severity: "error",
    });
  }
  return out;
}

// ── Rule 5: คะ/ค่ะ particle confusion (SAFE subset only) ──────────────────────
// Only the unambiguous "นะค่ะ" → "นะคะ". We deliberately DO NOT touch bare
// ค่ะ / คะ — choosing between them is context-dependent (statement vs. question)
// and flagging it floods false positives.
export function checkKhaParticle(text: string): Issue[] {
  const out: Issue[] = [];
  const bad = "นะค่ะ"; // นะค่ะ
  const good = "นะคะ"; // นะคะ
  let from = 0;
  for (;;) {
    const idx = text.indexOf(bad, from);
    if (idx === -1) break;
    out.push({
      start: idx,
      end: idx + bad.length,
      type: "ka-kha",
      message: 'ท้าย "นะ" ควรใช้ "คะ" ไม่ใช่ "ค่ะ"',
      suggestion: good,
      severity: "warn",
    });
    from = idx + bad.length;
  }
  return out;
}

// ── Rule 6: repeated word (warn) ─────────────────────────────────────────────
// Identical adjacent word tokens. Uses native Intl.Segmenter("th") — no
// dictionary needed for boundaries. Skips whitespace/punctuation tokens.
const hasSegmenter =
  typeof Intl !== "undefined" &&
  typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function";

type Tok = { text: string; start: number };

function wordTokens(text: string): Tok[] {
  if (!hasSegmenter) return [];
  const seg = new Intl.Segmenter("th", { granularity: "word" });
  const out: Tok[] = [];
  for (const s of seg.segment(text)) {
    // word-like only: must contain at least one Thai/alnum char
    if (/[ก-๛0-9A-Za-z]/.test(s.segment)) {
      out.push({ text: s.segment, start: s.index });
    }
  }
  return out;
}

export function checkRepeatWord(text: string): Issue[] {
  const out: Issue[] = [];
  const toks = wordTokens(text);
  for (let i = 1; i < toks.length; i++) {
    const a = toks[i - 1];
    const b = toks[i];
    if (a.text !== b.text) continue;
    if (a.text.trim().length < 2) continue; // skip single-char tokens (ก, ๆ, digits)
    // require the two tokens to be adjacent (only whitespace between them)
    const between = text.slice(a.start + a.text.length, b.start);
    if (between.length && !/^\s*$/.test(between)) continue;
    out.push({
      start: a.start,
      end: b.start + b.text.length,
      type: "repeat-word",
      message: "คำซ้ำ",
      suggestion: a.text,
      severity: "warn",
    });
  }
  return out;
}

// ── Rule 7: multiple spaces (warn) ───────────────────────────────────────────
// 2+ consecutive ASCII spaces collapse to one. (Intentionally ASCII space only —
// not tabs/newlines, which are meaningful in the editor.)
export function checkMultipleSpaces(text: string): Issue[] {
  const out: Issue[] = [];
  const re = / {2,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      type: "multi-space",
      message: "เว้นวรรคหลายช่อง",
      suggestion: " ",
      severity: "warn",
    });
  }
  return out;
}

// ── Rule 8: leading-vowel misuse (warn) ──────────────────────────────────────
// A front vowel เ แ โ ใ ไ must be followed by a consonant (it precedes its base
// in writing order). If followed by a non-consonant (mark, space, end, vowel),
// it's likely orphaned/mis-sequenced.
export function checkLeadingVowel(text: string): Issue[] {
  const out: Issue[] = [];
  for (let i = 0; i < text.length; i++) {
    if (!isLeadingVowel(text[i])) continue;
    const next = text[i + 1];
    if (next !== undefined && isConsonant(next)) continue; // legal
    out.push({
      start: i,
      end: i + 1,
      type: "leading-vowel",
      message: "สระหน้าไม่มีพยัญชนะตามหลัง",
      severity: "warn",
    });
  }
  return out;
}

// ── aggregate ────────────────────────────────────────────────────────────────
import { checkCommonMisspellings } from "./commonMisspellings";

const RULES: ((t: string) => Issue[])[] = [
  checkDoubleTone,
  checkDuplicateDiacritic,
  checkTwoAboveVowels,
  checkOrphanDiacritic,
  checkKhaParticle,
  checkRepeatWord,
  checkMultipleSpaces,
  checkLeadingVowel,
  checkCommonMisspellings, // Layer 2: curated common misspellings (wrong → right)
];

/**
 * Run every Layer-1 rule and return issues sorted by start offset (then end).
 * Pure & isomorphic — safe to call in the browser on every keystroke (debounced).
 */
export function checkThaiRules(text: string): Issue[] {
  if (!text) return [];
  const issues: Issue[] = [];
  for (const rule of RULES) issues.push(...rule(text));
  issues.sort((a, b) => a.start - b.start || a.end - b.end);
  return issues;
}
