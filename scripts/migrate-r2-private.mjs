// Move existing manga page images + payment slips out of the PUBLIC R2 bucket
// into the PRIVATE bucket, repoint the DB to bare keys, and delete the public
// copies — closing the public-exposure hole for already-uploaded content.
//
// Covers / avatars / novel images are left in the public bucket on purpose.
// Idempotent + re-runnable: already-migrated rows (bare key, not an http URL)
// are skipped, so a re-run resumes where an interrupted run left off.
//
// Usage (run from the project root, with .env present):
//   Dry run (counts only, changes nothing):
//     node --env-file=.env scripts/migrate-r2-private.mjs
//   Execute for real:
//     node --env-file=.env scripts/migrate-r2-private.mjs --go
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import pg from "pg";

const GO = process.argv.includes("--go");
const CONCURRENCY = 30; // R2 ops in flight at once

const {
  DATABASE_URL,
  CLOUDFLARE_R2_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET_NAME: PUBLIC_BUCKET,
  CLOUDFLARE_R2_PRIVATE_BUCKET: PRIVATE_BUCKET,
  CLOUDFLARE_R2_PUBLIC_URL: PUBLIC_URL,
} = process.env;

if (!PRIVATE_BUCKET) {
  console.error("✗ CLOUDFLARE_R2_PRIVATE_BUCKET is not set — aborting.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });

const keyOf = (url) => url.replace(`${PUBLIC_URL}/`, "");
const copySource = (key) => `${PUBLIC_BUCKET}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

async function moveOne(table, col, id, url) {
  const key = keyOf(url);
  await s3.send(new CopyObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key, CopySource: copySource(key) }));
  await s3.send(new HeadObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key })); // verify it landed
  await pool.query(`UPDATE "${table}" SET "${col}" = $1 WHERE id = $2`, [key, id]);
  await s3.send(new DeleteObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key })); // remove public copy
}

async function migrate(table, col) {
  const { rows } = await pool.query(
    `SELECT id, "${col}" AS url FROM "${table}" WHERE "${col}" LIKE 'http%'`
  );
  console.log(`\n[${table}.${col}] ${rows.length} object(s) to migrate`);
  if (!GO) {
    rows.slice(0, 3).forEach((r) => console.log(`  would move: ${keyOf(r.url)}`));
    if (rows.length > 3) console.log(`  ...and ${rows.length - 3} more`);
    console.log(`[${table}.${col}]  (DRY RUN — nothing changed)`);
    return;
  }

  let done = 0, fail = 0, idx = 0;
  const t0 = Date.now();
  async function worker() {
    while (idx < rows.length) {
      const r = rows[idx++];
      try {
        await moveOne(table, col, r.id, r.url);
        done++;
        if (done % 500 === 0) {
          const rate = Math.round(done / ((Date.now() - t0) / 1000));
          console.log(`  ...${done}/${rows.length}  (${rate}/s)`);
        }
      } catch (e) {
        fail++;
        console.error(`  FAIL ${keyOf(r.url)}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`[${table}.${col}] done=${done} fail=${fail}`);
}

await migrate("Page", "imageUrl");
await migrate("CoinOrder", "slipUrl");
await pool.end();
console.log(GO ? "\n✓ Migration complete." : "\n✓ Dry run complete. Re-run with --go to execute for real.");
