import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";
import { resolveOwnedChapter } from "@/lib/mangaOwner";
import { rateLimit } from "@/lib/rate-limit";
import type { Issue } from "@/lib/thaiSpellcheck/rules";
import { buildAllowList, checkDictionary } from "@/lib/thaiSpellcheck/dictionary";

// Server-side DICTIONARY-layer spellcheck (Layer 2) for the novel editor.
// Returns unknown-word issues with the per-work allow-list (Story Bible names +
// slang) already applied. Layer-1 rule checks run client-side via
// lib/thaiSpellcheck/rules.checkThaiRules. Offsets are into the posted `text`.
//
// NOTE v1: the unknown-word dictionary is deferred (no word list sourced yet),
// so this currently returns an empty `issues` array. The gate, rate-limit and
// allow-list pipeline are live so it lights up the moment a word list is added.

const MAX_TEXT = 200_000; // generous ceiling for a single chapter

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await resolveOwnedChapter(id);
  if ("err" in r) return r.err;
  if (!rateLimit(`spellcheck:${r.userId}`, 60, 60_000).ok) return apiError("RATE-001", 429);

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.slice(0, MAX_TEXT) : null;
  if (text === null) return apiError("VAL-001", 400, { message: "ต้องส่ง text" });

  // Allow-list (a): the work's Story Bible names + GLOSSARY bodies.
  const entries = await prisma.storyBibleEntry.findMany({
    where: { mangaId: r.chapter.mangaId, category: { in: ["CHARACTER", "WORLD", "GLOSSARY"] } },
    select: { title: true, body: true },
  });
  const allow = buildAllowList(entries);

  // Allow-list (b) curated slang is applied inside checkDictionary.
  const issues: Issue[] = checkDictionary(text, allow);

  return NextResponse.json({ issues });
}
