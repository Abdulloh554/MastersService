import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { Request } from "express";

// Limiterlar app darajasida auth'dan OLDIN ishlaydi, shuning uchun kalit
// sifatida faqat IP ishlatiladi (req.user hali yuklanmagan). Mobil NAT/Wi-Fi
// orqasida ko'plab foydalanuvchi bir IP'dan keladi — shuning uchun umumiy limit
// 100 dan 600 ga ko'tarildi, ochiq feed'lar uchun esa alohida yumshoqroq limiter.
const keyGenerator = (req: Request): string => req.ip ?? "unknown";

// Ochiq o'qish (feed) yo'llari — o'z (yumshoqroq) limiteriga ega;
// generalLimiter ularni o'tkazib yuboradi.
const isPublicFeed = (req: Request): boolean => {
  if (req.method !== "GET") return false;
  if (req.path === "/health") return true;
  return (
    /^\/api\/(ads|products)(\/[^/]+)?$/.test(req.path) ||
    req.path === "/api/categories" ||
    /^\/api\/reviews\/user\//.test(req.path)
  );
};

const tooManyRequests = {
  success: false,
  message: "Too many requests, please try again later.",
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: tooManyRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: isPublicFeed,
});

// Ochiq feed (GET /ads, /products, /categories, /reviews/user/:id) —
// alohida, empirik yuqoriroq limit.
export const publicReadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: tooManyRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});
