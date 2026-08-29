# MasterService — Server Arxitekturasi

> Maqsad: server tizimining qatlamlari, oqimlari, ma'lumotlar xaritasi, rol
> matritsasi va mobil ilova bilan integratsiya nuqtalari. 1M foydalanuvchiga
> tayyorlash auditining natijalari `AUDIT_REPORT.md` da.

## 1. Umumiy ko'rinish

- **Stack**: Node.js + Express 5 + Mongoose 8 (TypeScript, tsx bilan ishlaydi).
- **DB**: MongoDB Atlas (mongodb+srv), domen-orqali DNS (`family: 4`).
- **Auth**: JWT (access + refresh) + MongoDB'da `RefreshToken` saqlash (rotatsiya
  bilan). Refresh tokenlar `expiresAt` TTL indeksi bilan avtomatik o'chadi.
- **Pul modeli**: ichki `balance` (virtual valyuta). Naqd pul hech qayerda
  saqlanmaydi; to'lov TIZIM ICHIDA amalga oshiriladi.
- **AI**: GROQ (uxshash reja uchun statistika/xulosa, moderatsiya, e'lon taklifi)
  — faqat `GROQ_API_KEYS` berilsa yoqiladi.
- **Loglar**: pino.

### Texnologik xarita

| Qatlam | Texnologiya | Manzil |
|---|---|---|
| HTTP | Express 5, helmet, cors, express-rate-limit, zod | `src/app.ts` |
| Validatsiya | zod (body uchun) | `src/validators/*`, `src/middleware/validate.middleware.ts` |
| DB ODM | Mongoose 8 | `src/models/*.ts` |
| Xatolik | `AppError.*` + markaziy `errorHandler` | `src/utils/AppError.ts`, `src/middleware/errorHandler.ts` |
| NoSQL xavfsizlik | `$`/`.` strip (query+body+params) | `src/middleware/sanitize.ts` |
| Reja | node-cron (AI fraud, faqat ai.enabled bo'lsa) | `src/jobs/fraudDetection.job.ts` |
| AI | GROQ HTTP client + in-memory cache | `src/services/ai/*` |

## 2. Papka struktura va oqim

```
server/src/
├── app.ts                 # middleware zanjiri, /health, 404, errorHandler
├── server.ts              # DB bog'lash, AI cron, listen
├── config/                # index.ts (env), database.ts (Mongo), logger.ts (pino)
├── middleware/            # auth, role, rateLimiter, aiRateLimiter, sanitize,
│                          #   validate, errorHandler, requestLogger, contentModeration
├── routes/                # 12 ta route fayl + index.ts (prefix'lar)
├── controllers/           # req/res ni o'qiydi, service'ga uzatadi, next(error)
├── services/              # biznes-logika; xatolar AppError.*; pul ops — session
│   └── ai/                # fraud, insights, moderation, suggest, client
├── validators/            # zod schemalari (admin.validator mavjud emas!)
├── models/                # 13 ta Mongoose model (indekslari ichida)
├── utils/                 # AppError.ts, helpers.ts (paginate, JWT), api.types.ts
└── jobs/                  # fraudDetection.job.ts
```

Har bir so'rov oqimi:

```
Klient → app.ts middleware zanjiri → routes (auth/role/validate/rateLimit)
      → controller (try/catch → next(error))
      → service (AppError.* tashlaydi, session/transaction bilan pul operatsiyalari)
      → response { success, message?, data, pagination? }
```

## 3. Route inventari va rol matritsasi

Prefixlar (`src/routes/index.ts`): `/auth`, `/users`, `/ads`, `/orders`,
`/products`, `/favorites`, `/transactions`, `/admin`, `/categories`,
`/notifications`, `/ai`, `/reviews`.

| Method+Path | Auth | Rol cheki | Validatsiya | Limiter |
|---|---|---|---|---|
| POST `/auth/register` | — | — | zod | authLimiter (10/15m) |
| POST `/auth/login` | — | — | zod | authLimiter |
| POST `/auth/refresh` | — | — | **yo'q** | **yo'q** |
| POST `/auth/logout` | — | — | **yo'q** | **yo'q** |
| POST `/auth/forgot-password` | — | — | zod | authLimiter |
| POST `/auth/reset-password` | — | — | zod | authLimiter |
| PATCH `/auth/role` | ✅ | — | zod | — |
| GET/PUT/PUT/PUT/PUT `/users/me[/avatar/language/theme]` | ✅ | — | **yo'q** | — |
| GET `/users/master/:id` | ✅ | — | — | — |
| POST `/ads` | ✅ | client | zod+moderatsiya | — |
| GET `/ads`, GET `/ads/:id` | — | ochiq | — | general |
| GET `/ads/my` | ✅ | — | — | — |
| PUT/DELETE `/ads/:id` | ✅ | client | zod | — |
| POST `/ads/:id/accept` | ✅ | master | — | — |
| POST `/ads/:id/complete` | ✅ | master,client | — | — |
| POST `/ads/:id/cancel` | ✅ | master,client | — | — |
| GET `/orders`, `/orders/:id` | ✅ | (service'da tekshiradi) | — | — |
| PUT `/orders/:id/status` | ✅ | master,client,admin | zod | — |
| POST `/products` | ✅ | seller | zod+moderatsiya | — |
| GET `/products`, `/products/:id` | — | ochiq | — | general |
| GET `/products/seller/me` | ✅ | seller | — | — |
| PUT/DELETE `/products/:id` | ✅ | seller | — | — |
| POST `/products/:id/checkout` | ✅ | client,master,seller | — | — |
| GET `/favorites` | ✅ | — | — | — |
| POST/DELETE `/favorites...` | ✅ | — | — | — |
| GET `/transactions`, `/transactions/balance` | ✅ | — | — | — |
| GET `/categories` | — | ochiq | — | general |
| GET `/notifications`, `/unread-count`, PATCH read* | ✅ | — | — | — |
| POST `/ai/*` (4 endpoint) | ✅ | — | zod+AI limiter | max 5–20/min |
| GET `/reviews/user/:id` | — | ochiq | — | — |
| POST `/reviews` | ✅ | — | zod+moderatsiya | — |
| ADMIN `/admin/*` (19 route) | ✅ | admin (`router.use`) | **yo'q** | — |

**Javob formati**: `{ success, data, message?, pagination?: { page, limit, total, totalPages } }`.

## 4. Ma'lumotlar xaritasi (kolleksiyalar)

| Kolleksiya | Model | Asosiy maydonlar | Indekslar (hodi modelda) |
|---|---|---|---|
| `users` | User | role, phone (unique), balance, bioTranslations, reputation | `{role,isActive,createdAt:-1}`, `{phone} unique` |
| `ads` | Ad | clientId, category, title, budget, status, images[], acceptedBy | `{status,createdAt:-1}`, `{clientId,createdAt:-1}`, `{category,status}`, `{acceptedBy}` |
| `orders` | Order | clientId, masterId, adId, status, completedAt | `{masterId,status}`, `{clientId,status}`, `{adId}` |
| `transactions` | Transaction | fromUser, toUser, amount, type, status, relatedAd/Order/Product | `{fromUser,createdAt:-1}`, `{toUser,createdAt:-1}`, `{status,createdAt:-1}`, aloqalar |
| `products` | Product | sellerId, name, price, stock, category | `{sellerId,createdAt:-1}`, `{category,isActive}` |
| `categories` | Category | name (uz/ru/en), type (ad|product), order | `{type,isActive,order}` |
| `refresh_tokens` | RefreshToken | userId, familyId, hashedToken, expiresAt, revokedAt | `{expiresAt} TTL`, `{userId}`, `{familyId}` |
| `notifications` | Notification | userId, title, body, type, isRead, data | yo'q (mavjud emas) |
| `reviews` | Review | authorId, targetUserId, rating, sentiment, isSuspicious | yo'q (mavjud emas) |
| `favorites` | Favorite | userId, targetType, targetId | `{userId,targetType,targetId}`, `{targetId}` |
| `moderationqueues` | ModerationQueue | entityType, entityId, status, resolvedBy | yo'q |
| `fraudflags` | FraudFlag | entityType, entityId, riskScore, status, reason | yo'q |
| `passwordresets` | PasswordReset | userId, token hash, expiresAt | TTL |

> Toʻliq indeks holatini ko'rish/tiklash: `npx tsx scripts/audit-indexes.ts` (va `--sync`).

## 5. Auth va xavfsizlik oqimi

- `auth.middleware.ts`: Bearer tokenni JWT bilan tekshiradi, `req.user = { userId, role, ... }` qo'yadi.
- `role.middleware.ts`: `req.user.role`ni cheklaydi; `requireRole("admin")` berilgan rol ko'p bo'lishiga ruxsat.
- Access token 15m-ish; refresh — `RefreshToken` kolleksiyasi, qayta ishlatish
  aniqlansa (`familyId`) oila revoke qilinadi (`auth.service.refreshTokens`).
- Login/registerda `user-agent` va `req.ip` saqlanadi; `app.set("trust proxy",1)`.
- NoSQL injektsiya: `sanitize.ts` `$` va `.` kalitlarni query/body/paramsdan olib tashlaydi.
- Rate limit: umumiy 100/15m (`generalLimiter`), auth 10/15m (`authLimiter`),
  AI endpointlar — 5–20/min/user. **Hammasi in-memory (single-instance)**.
- Moderatsiya: `contentModeration.ts` — yaratish geometrik `moderationQueue`ga
  enqueue, past xavfli to'g'ridan-to'g'ri o'tadi.

## 6. Pul operatsiyalari va atomiklik

| Operatsiya | Session/Transaction | Manzil |
|---|---|---|
| `/ads/:id/accept` — master FG, acceptance fee 4999 | ✅ `startSession()`+`withTransaction` | `ad.service.ts:209` |
| `/ads/:id/complete` — client debit + master credit | ✅ (atomik status o'tish, double-payoldan himoya) | `ad.service.ts:305` |
| `/ads/:id/cancel` | ❌ ikkita alohida `save()` (ad+order) | `ad.service.ts:423` |
| `/products/:id/checkout` | ✅ | `product.service.ts:219` |
| `/orders/:id/status` | ❌ bo'sh status o'zgarishi (pul harakati yo'q) | `order.service.ts:70` |

Acceptance fee: `ad.service.ts:15` (`ACCEPTANCE_FEE = 4999`).

## 7. Real-time va background

- **Fraud**: 6 soatda bir marta node-cron + AI risk-skor → `FraudFlag` (faqat AI yoqilganda).
- **Insights**: admin panel uchun AI xulosalar, 6 soatlik in-memory cache (`insights.service.ts:15`).
- **Notifications**: `createNotification(...).catch(() => undefined)` — best-effort;
  real bildirishnoma (push/WebSocket) infratuzilmasi yo'q.

## 8. Mobil ilova integratistiyasi

- `mobile/src/constants/routes.ts` — API path'lar AYNAN server route'lari bilan mos keladi.
- `mobile/src/core/api/apiClient.ts` — axios interceptor; 401 bo'lsa `/auth/refresh`
  bilan token aylantiriladi (o'zaro bloklanmaslik uchun `failedQueue` + `isRefreshing`).
- `mobile/src/core/api/mappers.ts` — xom doclarni (`_id`) flat modelga o'tkazadi
  (`mapAd/mapOrder/mapTransaction/mapProduct`).
- Store'lar `PaginatedResponse<T> { data, page, totalPages, total }` formatini kutadi
  (server pagination bilan mos).

## 9. Muhim o'lcham (scaling) faktlari

- Server DB ga ulanadi bir marta; pool: `maxPoolSize:50, minPoolSize:10, socketTimeoutMS:45000` (`config/database.ts`).
- Barcha ro'yxat so'rovlari `paginate()` bilan cheklangan (max 100, `helpers.ts:44`).
- Barcha ro'yxat so'rovlari `.lean()` ishlatadi (hujjatlar bilan ortiqchaisn yuklamaydi).
- AI va rate-limit cachelari **in-memory** — multi-instance'da qo'shimcha choralardan so'ng
  Redis kerak (qarang `AUDIT_REPORT.md`).
- `GET /transactions` summary: har so'rovda foydalanuvchining butun tranzaksiya to'plamiga `$group` — o'lchamga qarab narx o'sadi.
- Admin dashboard: har refresh'da 11 `countDocuments` + 2 aggregate — 1M'da sekin.
- AI insights: davr bo'yicha `countDocuments({createdAt>=})` — `createdAt` bitta indekssiz skan.