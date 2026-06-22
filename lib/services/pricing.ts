// Editorial-services price card + quote math. Shared by the client form (live
// estimate) and the API route (authoritative recompute). Keep ALL pricing here
// so the two can never drift — the server is the source of truth, the client
// preview just mirrors it.

// Market-rate card (per word). 24฿ / 8฿ per 1,000 words → see /services.
export const RATES = {
  "พิสูจน์อักษร & เกลาภาษา": 0.024,
  "จัดเรียงหน้า": 0.008,
} as const;

export type ServiceKey = keyof typeof RATES;

export const SERVICE_KEYS = Object.keys(RATES) as ServiceKey[];

// New-customer promo: first 2,500 words free (once).
export const FREE_WORDS_NEW = 2500;

// No surprise minimum — quote reflects the rate card honestly. Bump if needed.
export const MIN_CHARGE = 0;

export function isServiceKey(s: string): s is ServiceKey {
  return s in RATES;
}

// Thai has no spaces — count word-like segments natively so the figure matches
// what we actually bill (whitespace splitting undercounts Thai ~6x).
export function countThaiWords(text: string): number {
  if (!text.trim()) return 0;
  try {
    const seg = new Intl.Segmenter("th", { granularity: "word" });
    let n = 0;
    for (const s of seg.segment(text)) if (s.isWordLike) n++;
    return n;
  } catch {
    // Segmenter unavailable (very old runtime): rough fallback by char/3.
    return Math.round(text.replace(/\s+/g, "").length / 3);
  }
}

export type QuoteLine = { service: string; words: number; rate: number; amount: number };

export type Quote = {
  words: number;
  freeWords: number;
  billableWords: number;
  newCustomer: boolean;
  lines: QuoteLine[];
  subtotal: number;
  total: number;
};

export function computeQuote(opts: { words: number; services: string[]; newCustomer: boolean }): Quote {
  const words = Math.max(0, Math.round(opts.words || 0));
  const newCustomer = !!opts.newCustomer;
  const freeWords = newCustomer ? Math.min(FREE_WORDS_NEW, words) : 0;
  const billableWords = Math.max(0, words - freeWords);

  // De-dupe + keep only known services, in price-card order for a stable quote.
  const chosen = SERVICE_KEYS.filter((k) => opts.services.includes(k));
  const lines: QuoteLine[] = chosen.map((s) => ({
    service: s,
    words: billableWords,
    rate: RATES[s],
    amount: Math.round(billableWords * RATES[s]),
  }));

  const subtotal = lines.reduce((a, l) => a + l.amount, 0);
  const total = subtotal > 0 ? Math.max(subtotal, MIN_CHARGE) : 0;
  return { words, freeWords, billableWords, newCustomer, lines, subtotal, total };
}

export function baht(n: number): string {
  return "฿" + Math.round(n).toLocaleString("en-US");
}

export function ratePerK(rate: number): string {
  return baht(rate * 1000) + " / 1,000 คำ";
}
