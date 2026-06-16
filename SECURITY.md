# INKVERSE — Security

## What is enforced in code

| Area | Control |
|---|---|
| Auth | NextAuth v5 (JWT). All mutating API routes call `auth()`; admin/translator routes also check `role`. |
| Passwords | bcrypt, cost 12. Min 8 chars (register). |
| Brute force | Per-account login throttle (5 / 5 min) in the credentials provider. |
| Rate limiting | `lib/rate-limit.ts` applied to register (5 / 10 min / IP), comment (10 / min / user), slip verify (6 / 5 min / user), and the creator routes — export (20/min), story-bible writes (60/min), revision restore (30/min), per user. |
| IDOR | Owner-scoped queries (`where: { id, userId }`) on notifications, orders, etc. |
| Input | Zod validation on register / comment / etc. No raw SQL, no `dangerouslySetInnerHTML`. |
| Payment slip | Amount must match order exactly; receiver verified; slip `transRef` is `@unique` (no reuse). |
| Omise webhook | Body is untrusted — the charge/transfer is **re-fetched from Omise** and amount/status verified before crediting. |
| Flood/DoS | `proxy.ts` throttles every request by IP (120/10s site-wide, 40/10s `/api`, 12/10s `/api/auth`) → 429. Best-effort app layer; pair with a CDN/WAF. |
| Headers | HSTS, CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy (`next.config.ts`). |
| Image proxy | `images.remotePatterns` restricted to known CDNs (no open proxy). |
| Secrets | `.env` is in `.gitignore`. `x-powered-by` disabled. |

## ⚠️ You must do these (cannot be fixed in code)

1. ~~**Rotate the EasySlip token**~~ ✅ **DONE 2026-06-16** — revoked + reissued, new token in Vercel prod env.
2. ~~**Production secrets / rotate shared creds**~~ ✅ **DONE 2026-06-16** — `NEXTAUTH_SECRET`, Neon password, R2 keys, Google secret, Omise secret all rotated and updated in Vercel prod + local `.env`. Verified prod healthy (home + `/api/manga` 200 = DB + secret OK).
3. ~~**HTTPS only**~~ ✅ live on `https://inksverse.com` (Vercel TLS + Cloudflare).
4. **Omise live** — when going live: use `skey_live_`/`pkey_live_`, and register the webhook URL `https://<domain>/api/webhooks/omise` in the Omise dashboard.
5. **Rate limiting / flood guard at scale** — `lib/rate-limit.ts` and `proxy.ts` keep counters in-memory (per instance). On multi-instance/serverless, move them to Redis/Upstash. For real volumetric DDoS, put **Cloudflare** (orange-cloud + "Under Attack" mode / rate-limiting rules) or **Vercel WAF** in front — the app layer alone cannot absorb a large attack.
6. **DB backups + least-privilege** — ensure the Neon role used by the app can't drop tables it doesn't need; enable point-in-time backups.

## Pentest audit 2026-06-17 — content-leak, auth/IDOR, XSS/fuzzing

Found + fixed (commits cb8c0e6, b0c21a1):

| Issue | Severity | Fix |
|---|---|---|
| `GET /api/manga/[slug]/[chapter]` returned full novel `content` + page keys for PREMIUM chapters with no auth/unlock check (bypassed the PremiumGate; no frontend consumer) | 🔴 critical | Mirror the reader: check unlock/ownership, return `content:null`+`pages:[]`+`locked:true` when not paid, sanitize HTML, serve signed page paths (no raw R2 keys). |
| Stored XSS via JSON-LD — creator-controlled manga title/description went through `JSON.stringify` into a `<script>` unescaped; `</script><img onerror>` broke out. Reachable by any user (creators are auto-approved) | 🔴 critical | `safeJsonLd()` escapes `<>&`→`\uXXXX` in `components/seo/JsonLd.tsx`. |
| Rate-limit bypass — `clientIp` trusted the leftmost `x-forwarded-for` (client-controlled; CF/proxies append), so a forged header rotated the key past every per-IP limit | 🟠 | Prefer `cf-connecting-ip`/`x-real-ip`; XFF rightmost as fallback (`lib/rate-limit.ts` + `proxy.ts`). |
| Pagination — `page=-1`→negative Prisma skip (500); `limit` unbounded (request whole table = DoS) | 🟠 | Clamp `page>=1`, `take` 1..100 on `/api/manga` + `/manga`, `/manga/[genre]`, `/discover`. |

Verified clean (no change needed): reader page omits locked content server-side; `/api/img` HMAC token + per-IP/user limits; offline-pages/export/revisions/chapters-pages owner-gated; all `admin/*` enforce ADMIN; register hard-codes `role:READER`; IDOR scoped (`comment`, `notifications`, `coin/order/*`, `bookmark`, `follow`, `tip`, uploads, withdraw); JWT role re-fetched from DB (tamper-proof); `renderNovel` strips script/onerror/`javascript:`; SQL-injection N/A (Prisma); login brute-force 5/5min/email + register 5/10min/IP confirmed blocking. Note: `AUTO_APPROVE_CREATORS` is ON (growth mode) — the creator role isn't a hard trust boundary until set to `false`.

## Launch-hardening (money paths) — fixed

| Issue | Severity | Fix |
|---|---|---|
| `/api/coin/topup` minted coins with no payment | 🔴 critical | Endpoint + `topupCoins()` removed. |
| `/pay` credited coins when `method ≠ CARD` or no Omise key | 🔴 critical | CARD-only; requires a **successful** Omise charge. Free credit only when `ALLOW_SANDBOX_PAYMENTS=true` (never in prod). |
| Withdrawal TOCTOU race → over-withdraw | 🔴 critical | Balance check + insert in a **Serializable** tx + one-in-flight guard + rate limit. |
| Double 20% fee on withdrawal | 🟠 bug | Removed — earnings are already net; withdrawals pay the full balance. |
| Profile image upload | 🟡 | Magic-byte check + `try/catch` around `sharp`. |
| Auto-withdraw | — | Bank-transfer only (Omise can't pay PromptPay-to-phone); network call kept outside the DB tx. |

**Serverless note:** `lib/rate-limit.ts` and `proxy.ts` keep counters in-memory = per instance. On Vercel the authoritative throttle MUST be the edge (Vercel WAF / Cloudflare rate-limiting). The app-layer limiter is defence-in-depth; the critical money paths are protected by DB-level atomic guards + idempotency, not by the rate limiter. Optionally back the limiter with Upstash Redis.

## Notes / residual risk

- CSP uses `'unsafe-inline'`/`'unsafe-eval'` (required by Next.js inline bootstrap). XSS is still mitigated by React escaping + no HTML sinks; tighten to nonces later if needed.
- Restricting `remotePatterns` may break images hosted on other domains — add hosts as needed.
