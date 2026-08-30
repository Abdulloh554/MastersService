import mongoose from "mongoose";
import dns from "dns";
import { config } from "../config";
import { UserRole } from "../types/user.types";
import User from "../models/User";
import Ad from "../models/Ad";
import Product from "../models/Product";
import Order from "../models/Order";
import Review from "../models/Review";
import Transaction from "../models/Transaction";
import Favorite from "../models/Favorite";
import Notification from "../models/Notification";
import RefreshToken from "../models/RefreshToken";
import PasswordReset from "../models/PasswordReset";
import PushToken from "../models/PushToken";
import ModerationQueue from "../models/ModerationQueue";
import FraudFlag from "../models/FraudFlag";

/**
 * Ma'lumotlar bazasini tozalash: faqat admin rolli foydalanuvchilar qoladi.
 * Client/master/seller userlar va ularning barcha content'lari o'chiriladi.
 * Kategoriyalar (Category) saqlanib qoladi.
 *
 * Ishlatish: npm run reset:data
 */
const init = async () => {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    family: 4,
  });

  const adminCount = await User.countDocuments({ role: UserRole.ADMIN });
  if (adminCount === 0) {
    throw new Error(
      "Bazada ADMIN user topilmadi. O'chirish to'xtatildi (xavfsizlik nazorati)."
    );
  }

  // 1. Content kolleksiyalari tozalanadi.
  const contentModels: Array<{ name: string; model: any }> = [
    { name: "Ad", model: Ad },
    { name: "Product", model: Product },
    { name: "Order", model: Order },
    { name: "Review", model: Review },
    { name: "Transaction", model: Transaction },
    { name: "Favorite", model: Favorite },
    { name: "Notification", model: Notification },
    { name: "RefreshToken", model: RefreshToken },
    { name: "PasswordReset", model: PasswordReset },
    { name: "PushToken", model: PushToken },
    { name: "ModerationQueue", model: ModerationQueue },
    { name: "FraudFlag", model: FraudFlag },
  ];

  const counts: Record<string, number> = {};
  for (const { name, model } of contentModels) {
    const res = await model.deleteMany({});
    counts[name] = res.deletedCount || 0;
  }

  // 2. Admin bo'lmagan userlar o'chiriladi.
  const usersRes = await User.deleteMany({ role: { $ne: UserRole.ADMIN } });
  counts.User = usersRes.deletedCount || 0;

  console.log("=== Tozalash yakunlandi ===");
  for (const [name, n] of Object.entries(counts)) {
    console.log(`- ${name}: ${n} ta o'chirildi`);
  }
  const remainingAdmin = await User.countDocuments({ role: UserRole.ADMIN });
  console.log(`\nQolgan ADMIN userlar: ${remainingAdmin}`);
};

init()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Tozalashda xato:", err?.message || err);
    process.exit(1);
  });
