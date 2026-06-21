// ── Layer-2 dictionary check (SERVER-SIDE) ───────────────────────────────────
// Flags Thai word tokens that are NOT in a known-word dictionary, AFTER applying
// the allow-list (Story Bible names + curated slang).
//
// STATUS v1: the unknown-word dictionary itself is DEFERRED. No suitable Thai
// word-list package exists on npm (only `thai-wordcut`, a wordcut engine with
// messy runtime deps and no clean exported list). Per spec we do NOT ship a
// half-baked tiny dictionary that floods false positives. So `KNOWN_WORDS` is
// empty and this layer currently returns [] — but the tokenizer + allow-list
// pipeline is fully wired, so dropping in a real word list later is a one-liner.

import type { Issue } from "./rules";
import { isSlang } from "./slang";

// When a real ~60k Thai word list is sourced, populate this Set (or swap to a
// trie). Empty ⇒ the unknown-word check is inert (returns no issues).
const KNOWN_WORDS: ReadonlySet<string> = new Set<string>();
const DICT_READY = KNOWN_WORDS.size > 0;

const hasSegmenter =
  typeof Intl !== "undefined" &&
  typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function";

// A token is "Thai word-like" if it contains a Thai letter (U+0E01–U+0E2E base
// range, broadened to ก–๛). Numbers / latin / punctuation are never flagged.
const isThaiWord = (s: string) => /[ก-ฮ]/.test(s);

/**
 * Split allow-list source strings (Story Bible titles + GLOSSARY bodies) into
 * individual tokens. Names can be multi-word ("จอห์น สมิธ", "ก, ข, ค"), so we
 * split on whitespace and commas and keep each Thai-word-like piece.
 */
export function buildAllowList(sources: { title: string; body?: string | null }[]): Set<string> {
  const allow = new Set<string>();
  const add = (raw: string) => {
    for (const piece of raw.split(/[\s,，、।|/]+/)) {
      const w = piece.trim();
      if (w) allow.add(w);
    }
  };
  for (const s of sources) {
    if (s.title) add(s.title);
    if (s.body) add(s.body); // GLOSSARY bodies contribute their words too
  }
  return allow;
}

/**
 * Run the dictionary layer. `allow` is the per-work allow-list from buildAllowList.
 * Offsets are into `text`. Returns [] while DICT_READY is false (v1).
 */
export function checkDictionary(text: string, allow: Set<string>): Issue[] {
  if (!DICT_READY || !hasSegmenter || !text) return [];
  const seg = new Intl.Segmenter("th", { granularity: "word" });
  const out: Issue[] = [];
  for (const s of seg.segment(text)) {
    const w = s.segment;
    if (!isThaiWord(w)) continue;
    const trimmed = w.trim();
    if (KNOWN_WORDS.has(trimmed)) continue;
    if (allow.has(trimmed)) continue;
    if (isSlang(trimmed)) continue;
    out.push({
      start: s.index,
      end: s.index + w.length,
      type: "unknown-word",
      message: "คำนี้อาจสะกดผิด หรือไม่อยู่ในพจนานุกรม",
      severity: "warn",
    });
  }
  return out;
}

export const DICTIONARY_READY = DICT_READY;
