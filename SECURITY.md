# INKVERSE — Security

## What is enforced in code

| Area | Control |
|---|---|
| Auth | NextAuth v5 (JWT). All mutating API routes call `auth()`; admin/translator routes also check `role`. |
| Passwords | bcrypt, cost 12. Min 8 chars (register). |
| Brute force | Per-account login throttle (5 / 5 min) in the credentials provider. |
| Rate limiting | `lib/rate-limit.ts` applied to register (5 / 10 min / IP), comment (10 / min / user), slip verify (6 / 5 min / user). |
| IDOR | Owner-scoped queries (`where: { id, userId }`) on notifications, orders, etc. |
| Input | Zod validation on register / comment / etc. No raw SQL, no `dangerouslySetInnerHTML`. |
| Payment slip | Amount must match order exactly; receiver verified; slip `transRef` is `@unique` (no reuse). |
| Omise webhook | Body is untrusted — the charge/transfer is **re-fetched from Omise** and amount/status verified before crediting. |
| Flood/DoS | `proxy.ts` throttles every request by IP (120/10s site-wide, 40/10s `/api`, 12/10s `/api/auth`) → 429. Best-effort app layer; pair with a CDN/WAF. |
| Headers | HSTS, CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy (`next.config.ts`). |
| Image proxy | `images.remotePatterns` restricted to known CDNs (no open proxy). |
| Secrets | `.env` is in `.gitignore`. `x-powered-by` disabled. |

## ⚠️ You must do these (cannot be fixed in code)

1. **Rotate the EasySlip token** — it was pasted into a chat. Revoke `52a2b27…` in the EasySlip dashboard and put the new one in `.env`.
2. **Production secrets** — set a fresh `NEXTAUTH_SECRET` in your host's env (the one in `.env` is for local). Never commit real secrets. Consider rotating the Neon/R2/Google/Omise creds that have been shared in chat.
3. **HTTPS only** — deploy behind TLS so HSTS + secure cookies take effect.
4. **Omise live** — when going live: use `skey_live_`/`pkey_live_`, and register the webhook URL `https://<domain>/api/webhooks/omise` in the Omise dashboard.
5. **Rate limiting / flood guard at scale** — `lib/rate-limit.ts` and `proxy.ts` keep counters in-memory (per instance). On multi-instance/serverless, move them to Redis/Upstash. For real volumetric DDoS, put **Cloudflare** (orange-cloud + "Under Attack" mode / rate-limiting rules) or **Vercel WAF** in front — the app layer alone cannot absorb a large attack.
6. **DB backups + least-privilege** — ensure the Neon role used by the app can't drop tables it doesn't need; enable point-in-time backups.

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
