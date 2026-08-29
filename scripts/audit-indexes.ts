/**
 * Indeks audit skripti.
 *
 * Ishga tushirish (dev):
 *   npx tsx scripts/audit-indexes.ts
 *
 * Yo'qolgan indekslarni yaratish uchun:
 *   npx tsx scripts/audit-indexes.ts --sync
 *
 * DIQQAT: --sync MongoDB'ga createIndex yozadi. Production'da faqat
 * qo'lda, tormozlash rejasidan so'ng run qiling.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import User from "../src/models/User";
import Ad from "../src/models/Ad";
import Order from "../src/models/Order";
import Transaction from "../src/models/Transaction";
import Product from "../src/models/Product";
import Category from "../src/models/Category";
import Favorite from "../src/models/Favorite";
import Notification from "../src/models/Notification";
import RefreshToken from "../src/models/RefreshToken";
import Review from "../src/models/Review";
import ModerationQueue from "../src/models/ModerationQueue";
import FraudFlag from "../src/models/FraudFlag";

const SYNC = process.argv.includes("--sync");

interface IndexAuditResult {
  collection: string;
  totalDocs: number;
  indexes: { key: Record<string, number>; unique?: boolean; name?: string }[];
  missingIndexSuggestions: string[];
}

const COLLECTION_SUGGESTIONS: Record<
  string,
  { path: string; reason: string }[]
> = {
  users: [
    {
      path: "{ role: 1, isActive: 1, createdAt: -1 }",
      reason: "admin dashboard/filter: rol+holat bo'yicha listlash va count",
    },
    {
      path: "{ phone: 1 } (unique)",
      reason: "login/register — phone bo'yicha tezkor lookup",
    },
  ],
  ads: [
    {
      path: "{ status: 1, createdAt: -1 }",
      reason: "public feed: faol e'lonlar yangilik tartibida",
    },
    {
      path: "{ clientId: 1, createdAt: -1 }",
      reason: "Mening e'lonlarim sahifasi",
    },
    {
      path: "{ category: 1, status: 1 }",
      reason: "kategoriya bo'yicha feed filtrlash",
    },
  ],
  orders: [
    {
      path: "{ clientId: 1, status: 1 }",
      reason: "client buyurtmalari lista + status filtri",
    },
    {
      path: "{ masterId: 1, status: 1 }",
      reason: "master buyurtmalari lista + status filtri",
    },
  ],
  transactions: [
    {
      path: "{ toUser: 1, createdAt: -1 } va { fromUser: 1, createdAt: -1 }",
      reason: "foydalanuvchi tranzaksiya tarixi (eng hot read)",
    },
    {
      path: "{ status: 1, createdAt: -1 }",
      reason: "admin daromad agregatsiyalari ($match status+date)",
    },
  ],
  products: [
    {
      path: "{ isActive: 1, category: 1, createdAt: -1 }",
      reason: "do'kon katalogi faol mahsulotlar + kategoriya filtri",
    },
    {
      path: "{ sellerId: 1, createdAt: -1 }",
      reason: "sotuvchining mahsulotlari sahifasi",
    },
  ],
  categories: [
    {
      path: "{ type: 1, isActive: 1, order: 1 }",
      reason: "har so'rovda Category.filter({type, isActive}).sort(order)",
    },
  ],
  refresh_tokens: [
    {
      path: "{ userId: 1, revokedAt: 1 }",
      reason: "logout/rokatsiya: user barcha tokenlarini topsih",
    },
    {
      path: "{ familyId: 1 }",
      reason: "token reuse aniqlashda family'ni o'chirish",
    },
  ],
  notifications: [
    {
      path: "{ userId: 1, isRead: 1, createdAt: -1 }",
      reason: "bildirishnomalar listi + o'qilmaganlar count",
    },
  ],
  reviews: [
    {
      path: "{ targetUserId: 1, createdAt: -1 }",
      reason: "master sahifasi sharhlari",
    },
  ],
  moderationqueues: [
    {
      path: "{ status: 1, createdAt: -1 }",
      reason: "admin moderatsiya navbati",
    },
  ],
  fraudflags: [
    {
      path: "{ status: 1, riskScore: -1 }",
      reason: "admin fraud ro'yxati (risk tartibida)",
    },
  ],
};

async function auditCollection(model: mongoose.Model<any>): Promise<IndexAuditResult> {
  const collectionName = model.collection.collectionName;
  const totalDocs = await model.countDocuments();
  const rawIndexes = await model.collection.indexes();
  const indexes = rawIndexes.map((idx: any) => ({
    key: idx.key,
    unique: Boolean(idx.unique),
    name: idx.name,
  }));

  const suggestions = COLLECTION_SUGGESTIONS[collectionName] || [];

  return {
    collection: collectionName,
    totalDocs,
    indexes,
    missingIndexSuggestions: suggestions.filter((s) => {
      return !indexes.some((idx) => {
        const keyJson = JSON.stringify(idx.key);
        const candidate = s.path
          .replace(/\s+/g, "")
          .toLowerCase()
          .slice(1, -1)
          .split(":")
          .join(":");
        const keyStr = keyJson
          .replace(/\s+/g, "")
          .toLowerCase()
          .slice(1, -1);
        return candidate.startsWith(keyStr) || keyStr.startsWith(candidate);
      });
    }).map((s) => s.path),
  };
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("✅ MongoDB ulandi\n");

  const models = [
    User,
    Ad,
    Order,
    Transaction,
    Product,
    Category,
    Favorite,
    Notification,
    RefreshToken,
    Review,
    ModerationQueue,
    FraudFlag,
  ];

  for (const model of models) {
    const result = await auditCollection(model);
    console.log(`📦 ${result.collection} (${result.totalDocs} hujjat)`);
    result.indexes.forEach((idx) => {
      console.log(`   - ${JSON.stringify(idx.key)}${idx.unique ? " (unique)" : ""}`);
    });
    if (result.missingIndexSuggestions.length > 0) {
      console.log(`   ⚠️ Taklif qilingan indekslar:`);
      result.missingIndexSuggestions.forEach((s) => console.log(`     → ${s}`));
    } else {
      console.log(`   ✅ Tavsiya etilgan indekslar mavjud`);
    }
    console.log("");
  }

  if (SYNC) {
    console.log("🔁 Model.syncIndexes() ishga tushirilmoqda...\n");
    for (const model of models) {
      const created = await model.syncIndexes();
      console.log(`   ${model.collection.collectionName}: ${JSON.stringify(created)}`);
    }
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Audit xatosi:", err);
  process.exit(1);
});