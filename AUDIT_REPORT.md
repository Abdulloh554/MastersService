# MasterService — Scalability & Security Audit (1M Foydalanuvchiga Tayyorgarlik)

> Bajarilgansan: 2026-08-29
> Doira: `MasterService/server` — Express 5 + Mongoose 8 backend.
> Maqsad: 100K→1M foydalanuvchi, yuqori trafik, ko'p-instance deploy holatida
> server havolari va xavfsizlik tekshiruvi. Tegishli arxitektura: `ARCHITECTURE.md`.

## Xulosa (TL;DR)

- **Eng issiq yo'llar** (feed, ro'yxatlar, profillar) `.lean()` + `paginate(100)` +
  kompozit indekslar bilan allaqachon yaxshi ishlangan. 🟢
- **Pul operatsiyalari** accept/complete/checkout session+transaction ichida (double-pay,
  salbiy balansdan himoyalangan) 🟢; `cancel` atomik emas 🟡.
- **Eng katta xavflar**: (1) global limit 100 req/15min/IP — mobil NAT'da legit
  foydalanuvchilarni kesadi; (2) admin dashboard da har refresh'da 11 `countDocuments`;
  (3) tranzaksiya summary — har so'rovda foydalanuvchining to'liq tarixini `$group` qiladi;
  (4) Redis yo'q — rate-limit, cache, multi-instance mumkin emas; (5) rasm objektini saqlash
  yo'q (string[] URI MongoDB'da).

---

## 🔴 Kritik — darhol tuzatilishi shart (✨ birinchi o'ringa)

### ✨ P1. Global rate-limit haddan tashqari qattiq va shakllangan — ✅ QO'LLANDI

`app.ts` ga `generalLimiter` **barcha** route'larga biriktirilgan — 100 so'rov/15 daqiqa
**IP boshiga**. Mobil ilova bitta NAT/Wi-Fi orqali ishlaydigan minglab foydalanuvchi bir
IP'dan kelganda juda tez "Too many requests" oladi (avtomatik yangilash + pull-refresh).

- Manzil: `src/middleware/rateLimiter.ts:3` (generalLimiter), `src/app.ts:App.use` tartibi.
- Tuzatish (qo'llandi):
  - Umumiy limit 100 → **600 req/15m/IP** (`rateLimiter.ts`)
  - Ochiq feed yo'llari (`GET /ads`, `/products`, `/categories`, `/reviews/user/:id`)
    `generalLimiter` dan chiqarildi → alohida **`publicReadLimiter` (1000 req/15m/IP)**;
    `/health` ham skip qilinadi
  - Feed route'lari: `ad.routes.ts`, `product.routes.ts`, `category.routes.ts`, `review.routes.ts`
  - Multi-instance uchun `store` = Redis (quyida P4) — IP kalit hali in-memory

### ✨ P2. Admin dashboard: har refresh'da 11 `countDocuments` + 2 aggregate — ✅ QO'LLANDI

`getDashboardStats` hamma ko'rsatkichlarni `Promise.all` bilan har so'rovda to'liq hisoblaydi
(`admin.service.ts:34-48`). 1M hujjatda `countDocuments` (haqiqiy skan) juda sekinlashadi,
admin panel da test qilinadigan narsa emas.

- Tavsiya (qo'llandi):
  1. **60 soniyalik in-memory cache** — takroriy refresh'lar DB'ga bormaydi
  2. Jami (filter'siz) `countDocuments` → **`estimatedDocumentCount()`** (metadata'dan tez son)
  3. Rol/status'li filtrlar indeksli `countDocuments` bo'lib qoladi (users `{role,...}` indeksi bor)
  4. Yakuniy muqobil: `stats` kolleksiyasi + reja bilan oldindan hisoblash — Redis bilan birga (P4)

### ✨ P3. `GET /transactions` — summary har so'rovda butun tarixni `$group` qiladi — ✅ QO'LLANDI (kesh)

`getTransactions` oddiy ro'yxat bilan birga ushbu foydalanuvchining **barcha**
tranzaksiyalariga `$match($or from/to) → $project → $group` ishlatadi
(`transaction.service.ts:24-56`). Tranzaksiyalar soni oshadi — har bir so'rov narxi chiziqli.

- Tavsiya (qo'llandi — bosqich 1):
  1. **5 daqiqalik, sig'imi cheklangan (5000) in-memory kesh** (`summaryCache`) —
     takroriy ochishlar agregatsiyani barcha qilmaydi; to'ldirilganda eng eski yozuv o'chadi
  2. Kelajakda (P4 bilan): `User` ga denormal `totalIn/totalOut` va write'da `$inc`
  3. Orqa bosqich sifatida: agregatni alohida background vazifasiga ko'chirish

### ✨ P4. Redis yo'q → rate-limit, AI cache, multi-instance

Barcha limit (auth/general/AI) va `insights` cache (6 soatlik in-memory `Map`,
`ai.service/insights.service.ts:15`) update tufayli har mirror ishga
tushgach qayta ishlanadi.

- Tavsiya: `upstash-redis` / `ioredis` qo'shish:
  - `rateLimit` → `store: new RedisStore(...)`
  - `insights` cache → Redis TTL (6h)
  - refresh token oilasini kesishda race → Redis Lua
  - reja: faqat multi-instance'ga o'tishda majburiy.

### ✨ P5. Rasmlar obyekt saqlashda emas, MongoDB string[] da

Kodda `images: string[]` — **server'ga upload endpoint yoki S3/MTN yo'q**; mobil
`ImagePicker` `file://` URI larini to'g'ridan-to'g'ri APIga yuboradi. `multer`+`sharp`
dependency da bor, lekin `src`'da ishlatilmayapti. 1M user'da DB hajmi asosiy o'sish
manbai rasm hisoblanadi va boshqa foydalanuvchi uchun `file://` URI ma'nosiz.

- Tavsiya:
  1. upload endpoint (`/api/uploads`, multer+sharp→webp, max 5MB) + S3/R2/Cloudinary;
  2. `images` field'da faqat CDN URL lari saqlansin;
  3. `ad.validator` da `images` massiv uzunligi (mas. ≤10) va element uzunligi cheki;
  4. mobil: upload'ga `file://` emas, blob/base64 yuborishi kerak.

---

## 🟡 Muhim — tez orada hal qilish kerak

| № | Topilma | Manzil | Tavsiya |
|---|---|---|---|
| 1 | `cancelAd` ikkita alohida `save()` (ad+order), transaction emas | `ad.service.ts:423-465` | session+withTransaction ga o'tish; TTL nagzatlarni aniqlash |
| 2 | Admin search — indekssiz `$regex` (name/description) + countDocuments | `admin.service.ts:161, 262` | Atlas Search / `$text` indeks; yoki prefix regex + limit |
| 3 | AI insights — `User/Ad/Order.countDocuments({createdAt>=})` da `createdAt` bitta indekssiz | `insights.service.ts:34-37` | `{createdAt}` indekslari yoki stats kolleksiyasi |
| 4 | `POST /auth/refresh`, `/auth/logout` — limiter va validatsiya yo'q | `auth.routes.ts:30-32` | refresh rotation spam/hasilni — limiter (mas. `authLimiter` family) |
| 5 | `PUT /users/me*` — zod validatsiya yo'q (service whitelist qiladi) | `user.routes.ts:9-15` | ruxsat etilgan maydonlar uchun zod schema |
| 6 | `validate` faqat `req.body` ni tekshiradi; query hech qachon | `middleware/validate.middleware.ts:6` | query schema'lari (page/limit/sort/status) |
| 7 | admin CRUD — `updateUserStatus`, kategoriya, mitigasiya route'larida zod yo'q | `admin.routes.ts:15-49` | admin.validator yaratish |
| 8 | `category.controller` xatoda `next(error)` yo'q — 500 qaytaradi, log yo'q | `controllers/category.controller.ts:19-24` | mustahkam error handling |
| 9 | `getOrders` uchun `seller` rolida `{_id:null}` filter — listz ustida ObjectId validatsiyasi yo'q | `order.service.ts:19-23` | schema'ga `page`/`limit` validator |
| 10 | Frauds N+1: har top-spender uchun `findOne`+`findById` | `ai/fraud.service.ts:87-125` | `$in` bulk so'rovlar (1 round-trip) |
| 11 | `PATCH /auth/role` — istalgan auth user rolini client/master/seller'ga o'zgartira oladi (master bonus 100K) | `auth.routes.ts:48-53`, `auth.service.updateRole` | rollarni flipplash qoidalari / max rol soni cheki; bonus abuse xavfi |
| 12 | Skip-based pagination — yuqori sahifalar chuqur skip (sekin) | barcha list'lar | pastning ID/key (`cursor` = `_id`+`createdAt`) versiyasi 1M'da |

---

## 🟢 Yaxshi — saqlab qolish (buzilib qolmasin)

- ✅ **`.lean()` barcha ro'yxat so'rovlarida** — ad.service/product.service/order.service/
  transaction.service/admin.service/user.service/review.service/category (hudi ayni kunda qo'llandi).
- ✅ **`paginate()` har bir list'da** — max 100 (`helpers.ts:44-49`), offset chegaralangan.
- ✅ **Pul ops atomik**: accept/complete/checkout session+transaction; double-pay, salbiy
  balans, cancel/resurrect himoyalangan (`ad.service.ts:209,305`, `product.service.ts:219`).
- ✅ **NoSQL sanitizer** query+body+params qamraydi (`sanitize.ts`); `$`/`.` chiqarib tashlanadi.
- ✅ **JWT access/refresh alohida secretlar**, `HS256` ochiq algoritm cheklovi.
- ✅ **Troubled/rotatsiya**: refresh token `familyId` + `revokedAt`; reuse aniqlansa oila revoke.
- ✅ **Markaziy errorHandler** — AppError (IAM), JWT, CastError, ValidationError, 11000,
  `entity.parse.failed`→400, `entity.too.large`→413, MulterError→400 (hudi ayni kunda qo'llandi).
- ✅ **Kompozit indekslarga o'tish** (hududi ayni kunda): ads/orders/transactions/products/
  users/categories/favorites/refresh_tokens — eng issiq filtrlarni qamraydi.
- ✅ **DB pool tuning**: `maxPoolSize:50, minPoolSize:10, socketTimeoutMS:45000, family:4`.
- ✅ **`trust proxy: 1`** (proksi orqasida `req.ip` to'g'ri).
- ✅ Mobilda **axios refresh-queue** (`isRefreshing` + `failedQueue`) — 401 spamidan himoya.
- ✅ AI endpointlar uchun **per-user limiterlar** (listing 5/min, product 5/min, profile 10/min
  support 10/min).

---

## Indeks holati (model darajasida tekshirildi)

| Kolleksiya | Mavjud indekslar (model) | Holat |
|---|---|---|
| `users` | `{phone} unique`, `{role,isActive,createdAt:-1}` | OK; `{createdAt}` yakka — qo'shimcha (insights) |
| `ads` | `{status,createdAt:-1}`, `{clientId,createdAt:-1}`, `{category,status}`, `{acceptedBy}` | OK |
| `orders` | `{clientId,status}`, `{masterId,status}`, `{adId}` | OK |
| `transactions` | `{fromUser,createdAt:-1}`, `{toUser,createdAt:-1}`, `{status,createdAt:-1}`, aloqa indekslari | OK |
| `products` | `{sellerId,createdAt:-1}`, `{category,isActive}` | +`{isActive,category,createdAt:-1}` tavsiya |
| `categories` | `{type,isActive,order}` | OK |
| `refresh_tokens` | `{expiresAt} TTL`, `{userId}`, `{familyId}` | OK |
| `notifications` | `{userId,isRead,createdAt:-1}` | OK |
| `reviews` | `{targetUserId,createdAt:-1}`, `{authorId}` | OK |
| `moderationqueues` | `{status}`, `{entityType,entityId}` | OK |
| `fraudflags` | `{status}`, `{entityType,entityId,status}` | OK |
| `favorites` | `{userId,targetType,targetId}`, `{targetId}` | OK |

> Har biriga yorug'lik: `npx tsx scripts/audit-indexes.ts` (yozuv bermaydi), indekslarni
> yangilash uchun `--sync`. **Production'da `--sync` ni rejalashtirilgan vaqtda** run qiling.

---

## k6 Load Test — holat: ⚠️ Skript tayyor, natija keltirilmagan

Ishga tushirilmadi — mahalliy `k6` muhiti kerak / deploy muhiti ko'rsatilmagan.

```bash
# lokal:
k6 run --env BASE_URL=http://localhost:5000 server/load-test/scenarios/full-flow.js
# prod (mas., Render/Atlas):
k6 run --env BASE_URL=https://your-api.example.com server/load-test/scenarios/full-flow.js
```

`full-flow.js` har VU: login (yoki register)→ feed → kategoriya → products → orders.
Skript RAMPLING-VUS 0→2000 VU, threshold `p(95)<1000ms`, `p(99)<2000ms`, error rate <2%.

Natijalar jadvali (1M gacha o'lchov):

| № | Holat | VU | RPS | DS | p(95) | p(99) | Xatolar | Kuzatish |
|---|---|---|---|---|---|---|---|---|
| 1 | o'lchanmadi | 50 | — | — | — | — | — | isinish |
| 2 | o'lchanmadi | 300 | — | — | — | — | — | o'rta |
| 3 | o'lchanmadi | 1000 | — | — | — | — | — | yuqori |
| 4 | o'lchanmadi | 2000 | — | — | — | — | — | pik |

> Kuzatish: k6 natijalari chiqqach jadval to'ldiriladi.

---

## Infratuzilma / deploy yo'nalishi (1M tayyorlash uchun qadamlar)

1. **Hoziroq** (hech qandayoq yangi infza talab bo'lmaydi):
   - P1–P3, P5 va 🟡 №1, №10 fikslari; indeks `--sync` reja bilan.
2. **Yaqin muddat**:
   - Rasm upload + S3/CDN; skip-based pagination → cursor pagination; refresh-limiter.
   - Statistika kolleksiyasi + precompute; AI insights `createdAt` indekslari.
3. **Sales tipini oshirishda**:
   - Redis (rate-limit + cache + queue); multi-instance; strechPools va ReadPref
     (`read: nearest`); Geo-replica location'siz ishlatish.

---

## O'zgarishlar ro'yxati (ushbu auditda qo'llangan)

- `.lean()` — qolgan barcha list so'rovlari (ad/product/order/transaction/admin/user/review/category).
- Indekslar — ads/orders/transactions/products/users/categories/favorites/refresh_tokens
  (kompozit, model darajasida).
- `notification.service.ts` — `getNotifications` endi `paginate()` (limitsiz o'rniga).
- `config/database.ts` — pool parametrlari (`maxPoolSize:50`, `minPoolSize:10`,
  `socketTimeoutMS:45000`, `family:4`).
- `app.ts` — `trust proxy: 1`.
- `errorHandler.ts` — JSON parse/large/Multer error branch'lari.
- **P1** — `rateLimiter.ts`: umumiy limit 600/15m, `publicReadLimiter` (1000/15m) ochiq feed'lar
  (ads/products/categories/reviews), `/health` skip; feed route'larida mount.
- **P2** — `admin.service.ts`: dashboard 60s cache + `estimatedDocumentCount()`.
- **P3** — `transaction.service.ts`: summary agregatsiyasi 5-min cheklangan kesh orqasida.
- Yangi fayllar: `scripts/audit-indexes.ts`, `load-test/scenarios/full-flow.js`,
  `ARCHITECTURE.md`, `AUDIT_REPORT.md`.

> Keyingi qadam: P4–P5 (Redis + rasm upload) alohida bosqich sifatida; k6 deploy'da yugurish;
> so'ng `npm run dev` + `npx vitest run` to'liq regressiya.