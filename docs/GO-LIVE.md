# INKVERSE — Go-Live Checklist (เปิดรับเงินจริง)

ทำตามลำดับนี้ก่อนเปิดให้ผู้ใช้จริง. โค้ดพร้อมแล้ว — เหลือ "ตั้งค่า env + ผู้ให้บริการ" ที่แก้ในโค้ดไม่ได้.

## 0. ⚠️ R2 CORS — แก้บั๊ก "อัปโหลดหน้าตอนไม่สำเร็จ"
สาเหตุที่อัปโหลดหน้าตอนล้มเหลว: R2 bucket **ยังไม่มี CORS policy** (ค่าเริ่มต้นไม่มี) → เบราว์เซอร์อัปโหลดตรงไป R2 (presigned PUT) ไม่ได้. ต้องตั้ง CORS ให้ bucket `inkverse` (ทำครั้งเดียว):

**วิธี A — Cloudflare dashboard:** R2 → bucket `inkverse` → Settings → CORS Policy → เพิ่ม:
```json
[{ "AllowedOrigins": ["https://inkverse-tau.vercel.app","http://localhost:3000"],
   "AllowedMethods": ["PUT","GET","HEAD"], "AllowedHeaders": ["*"],
   "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3600 }]
```

**วิธี B — สคริปต์ (รันในเครื่องด้วย `! node set-cors.mjs`):**
```js
import "dotenv/config";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
const r2 = new S3Client({ region:"auto",
  endpoint:`https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials:{ accessKeyId:process.env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey:process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY }});
await r2.send(new PutBucketCorsCommand({ Bucket:process.env.CLOUDFLARE_R2_BUCKET_NAME,
  CORSConfiguration:{ CORSRules:[{ AllowedMethods:["PUT","GET","HEAD"],
    AllowedOrigins:["https://inkverse-tau.vercel.app","http://localhost:3000","http://127.0.0.1:3000"],
    AllowedHeaders:["*"], ExposeHeaders:["ETag"], MaxAgeSeconds:3600 }]}}));
console.log("CORS set");
```
> โค้ดฝั่ง upload ปรับให้บีบอัดรูปเล็กลง (≤1600px) แล้ว เพื่อให้ fallback ผ่าน body limit ของ Vercel ระหว่างที่ยังไม่ได้ตั้ง CORS — แต่ตั้ง CORS คือทางที่ถูกต้องและสเกลได้

## 1. Omise (การชำระเงิน)
- [ ] เปลี่ยนเป็น **live keys**: `OMISE_SECRET_KEY=skey_live_...`, `OMISE_PUBLIC_KEY=pkey_live_...` (และในโค้ดฝั่ง client ที่ใช้ pkey)
- [ ] ลงทะเบียน webhook ใน Omise dashboard → `https://<domain>/api/webhooks/omise`
- [ ] ทดสอบจ่ายจริงจำนวนน้อย ทุกช่องทาง (บัตร / PromptPay / mobile banking / e-wallet) → เหรียญเข้าถูกต้อง
- [ ] เปิด payout/transfers ในบัญชี Omise (สำหรับถอนเงินนักแปลอัตโนมัติ) + เติม balance พอจ่าย
- [ ] **อย่าตั้ง** `ALLOW_SANDBOX_PAYMENTS` ใน production (ปล่อยว่าง = ปิด — กันเครดิตฟรี)

## 2. Secrets (หมุน/ตั้งใหม่ — ห้าม commit)
- [ ] `NEXTAUTH_SECRET` ใหม่บน host (อย่าใช้ของ local)
- [ ] หมุน **EasySlip token** (เคยถูกแชร์ — ดู SECURITY.md), Neon, R2, Google OAuth secret หากเคยหลุดในแชต
- [ ] `SITE_URL` / `NEXTAUTH_URL` = โดเมนจริง (https)

## 3. อีเมล (Resend)
- [ ] ตั้ง `RESEND_API_KEY` + ยืนยันโดเมนผู้ส่ง + `EMAIL_FROM="INKVERSE <noreply@yourdomain>"`
- [ ] ทดสอบ: ลืมรหัสผ่าน → ได้อีเมล, เติมเหรียญ → ได้ใบเสร็จ
- (ไม่มี key ก็ไม่ crash — แค่ไม่ส่งอีเมล)

## 4. ความปลอดภัยระดับ edge (สำคัญสำหรับ DDoS)
- [ ] เปิด **Vercel WAF** / ใส่ Cloudflare หน้าโดเมน (rate-limiting rules / Under-Attack mode)
- [ ] (แนะนำ) ตั้ง `UPSTASH_REDIS_REST_URL/TOKEN` ถ้าจะทำ rate-limit ข้าม instance — ปัจจุบัน in-memory ต่อ instance เป็น best-effort; money paths ปลอดภัยด้วย DB guard อยู่แล้ว

## 5. Legal & content
- [ ] ตรวจหน้า `/terms /privacy /dmca /about` ให้เนื้อหาตรงกับธุรกิจจริง + ใส่ชื่อนิติบุคคล/ที่อยู่ติดต่อ
- [ ] เตรียมคอนเทนต์เปิดตัว + นักแปลพร้อมลงผลงาน (ดู docs/MARKETING-PLAN.md)

## 6. สำรองข้อมูล
- [ ] เปิด point-in-time backup บน Neon + จำกัดสิทธิ์ DB role ของแอป (least privilege)

## 7. หลังเปิด
- [ ] ติด error monitoring (Sentry)
- [ ] ตั้ง cron reconcile transfer ที่ค้าง PROCESSING (เรียก `getTransferStatus` / refresh-transfer)
