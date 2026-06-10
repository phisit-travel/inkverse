import "dotenv/config";
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

const AllowedOrigins = [
  "https://inkverse-tau.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

await r2.send(
  new PutBucketCorsCommand({
    Bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedMethods: ["PUT", "GET", "HEAD"],
          AllowedOrigins,
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  })
);
console.log("✓ CORS set on bucket:", Bucket);

const got = await r2.send(new GetBucketCorsCommand({ Bucket }));
console.log(JSON.stringify(got.CORSRules, null, 2));
await r2.destroy?.();
