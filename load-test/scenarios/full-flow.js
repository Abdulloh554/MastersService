// MasterService — load test (k6)
//
// Ishga tushirish:
//   k6 run --env BASE_URL=https://your-api.onrender.com server/load-test/scenarios/full-flow.js
//   k6 run --env BASE_URL=http://localhost:5000 server/load-test/scenarios/full-flow.js
//
// QAIDALAR:
//   - Auth'li endpointlarni bosish uchun har bir VU o'zi uchun random foydalanuvchi
//     yaratadi (register) yoki eski loginni qaytaradi. LD test boshida issiq yugurish
//     uchun credential'lar .env dan berilishi mumkin.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const listingsDuration = new Trend('listings_duration');
const ordersDuration = new Trend('orders_duration');
const logins = new Counter('logins_total');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'Test1234!';

// Oldindan yaratilgan userlarsiz ham ishlashi uchun random telefon oladi.
// Atlas M0 da unique index bo'yicha xatolik chiqsa — telefon yana randomlanadi.
const randomPhone = () =>
  `+9989${Math.floor(Math.random() * (99 - 10 + 1)) + 10}${Math.floor(
    Math.random() * 10000000,
  )
    .toString()
    .padStart(7, '0')}`;

export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 }, // isinish
        { duration: '2m', target: 300 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 2000 }, // pik
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    errors: ['rate<0.02'],
  },
};

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // 1. Login (yoki register+auth) — har VU bitta sessiya o'rnatadi.
  const phone = randomPhone();
  let user = loginOrRegister(phone, headers);

  // Publik feedlar — eng ko'p yuklanadigan yo'llar.
  const listRes = http.get(
    `${BASE_URL}/api/ads?page=1&limit=20&sort=createdAt`,
    { headers: { Authorization: `Bearer ${user.accessToken}` } },
  );
  listingsDuration.add(listRes.timings.duration);
  check(listRes, { 'ads list 200': (r) => r.status === 200 }) || errorRate.add(1);

  const catRes = http.get(`${BASE_URL}/api/categories`, headers);
  check(catRes, { 'categories 200': (r) => r.status === 200 }) || errorRate.add(1);

  const prodRes = http.get(`${BASE_URL}/api/products?page=1&limit=20`, headers);
  check(prodRes, { 'products list 200': (r) => r.status === 200 }) || errorRate.add(1);

  // Auth'li endpoint — buyurtmalar tarixi.
  const ordersRes = http.get(`${BASE_URL}/api/orders?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  ordersDuration.add(ordersRes.timings.duration);
  check(ordersRes, { 'orders 200': (r) => r.status === 200 }) || errorRate.add(1);

  // Paydo bo'lish: feed + profil, har 3-6 soniyada bitta VU.
  sleep(Math.random() * 3 + 1);
}

// Ro'yxatdan o'tkazib, session o'rnatib beradi (birinchi marta ~100% xit beradi,
// LD boshlashdan oldin bir nechta user yaratish uchun qulay).
function loginOrRegister(phone, headers) {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ phone, password: TEST_PASSWORD }),
    { headers },
  );
  logins.add(1);
  loginDuration.add(loginRes.timings.duration);

  if (loginRes.status === 200) {
    const data = loginRes.json('data');
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  }

  // Telefon topilmadi — yangi user yaratamiz.
  const regRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      firstName: 'Load',
      lastName: 'Test',
      phone,
      password: TEST_PASSWORD,
      role: 'client',
    }),
    { headers },
  );
  if (regRes.status === 201) {
    const data = regRes.json('data');
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  }

  errorRate.add(1);
  console.warn(
    `login/register failed: login=${loginRes.status} register=${regRes.status} phone=${phone}`,
  );
  return { accessToken: '', refreshToken: '' };
}