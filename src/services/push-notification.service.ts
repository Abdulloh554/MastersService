import mongoose from "mongoose";
import PushToken from "../models/PushToken";
import User from "../models/User";
import Category from "../models/Category";
import { UserRole } from "../types/user.types";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

/**
 * Bir foydalanuvchining kategoriya obunasi bo'yicha push-bildirishnomalarni
 * qayta ishlovchi servis. Expo Push API — ommaviy, alohida autentifikatsiya
 * talab qilmaydi.
 */

export interface ExpoPushMessage {
  to: string;
  sound?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

export interface ExpoPushTicket {
  status: string;
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface SendPushInput {
  title?: string;
  body?: string;
  sound?: string;
  data?: Record<string, unknown>;
  categoryIds?: mongoose.Types.ObjectId[];
}

/**
 * Foydalanuvchining push-tokenini ro'yxatga oladi (yoki yangilaydi).
 * Bir xil userId uchun bir nechta qurilma tokeni bo'lishi mumkin.
 */
export const registerToken = async (input: {
  userId: string;
  token: string;
  platform?: string;
  categoryIds?: string[];
}) => {
  const platform = (input.platform || "android").toLowerCase();
  const existing = await PushToken.findOne({ token: input.token });

  if (existing) {
    existing.userId = new mongoose.Types.ObjectId(input.userId);
    existing.platform = platform;
    if (input.categoryIds) {
      existing.categoryIds = (input.categoryIds as string[]).map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return PushToken.create({
    userId: new mongoose.Types.ObjectId(input.userId),
    token: input.token,
    platform,
    categoryIds: (input.categoryIds || []).map(
      (id) => new mongoose.Types.ObjectId(id)
    ),
    isActive: true,
  });
};

/**
 * Foydalanuvchining barcha faol push-tokenlaridagi kategoriyalarni yangilaydi.
 */
export const updateTokenCategories = async (
  userId: string,
  categoryIds: string[]
) => {
  const ids = (categoryIds || []).map((id) => {
    try {
      return new mongoose.Types.ObjectId(id);
    } catch {
      return null;
    }
  }).filter((id): id is mongoose.Types.ObjectId => id !== null);

  const result = await PushToken.updateMany(
    { userId: new mongoose.Types.ObjectId(userId), isActive: true },
    { categoryIds: ids }
  );
  return { modified: result.modifiedCount };
};

/**
 * Tegishli kategoriyaga obuna bo'lgan barcha faol Master'larning tokenlarini
 * yig'ib, 100 tadan guruhlab Expo'ga push yuboradi. Natijalarni loglaydi va
 * o'chirilgan qurilmalar (DeviceNotRegistered) chiqib qolgan tokenlarni
 * nofaol qiladi.
 */
export async function sendPushToCategory(
  categoryId: mongoose.Types.ObjectId | string,
  input: SendPushInput
): Promise<{ sent: number; failed: number }> {
  const catId = new mongoose.Types.ObjectId(categoryId);
  const category = await Category.findById(catId).lean();
  const categoryName =
    category && category.name ? category.name.uz || "Yangi buyurtma" : "Yangi buyurtma";

  // Kategoriyani o'z profilida belgilagan faol Master'lar.
  const masters = await User.find({
    role: UserRole.MASTER,
    isActive: true,
    categoryIds: catId,
  })
    .select("_id")
    .lean();

  if (masters.length === 0) return { sent: 0, failed: 0 };

  const masterIds = masters.map((m) => m._id);

  // Faol tokenlar + (agar kategoriya ko'rsatilmagan bo'lsa, hamma tokenlar).
  const tokens = await PushToken.find({
    userId: { $in: masterIds },
    isActive: true,
    ...(input.categoryIds
      ? { categoryIds: { $in: input.categoryIds } }
      : {}),
  }).lean();

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    sound: input.sound || "notification_sound",
    title: input.title || "Yangi buyurtma",
    body: input.body || categoryName,
    data: input.data || {},
    ...(t.platform === "android" ? { channelId: "order-alerts" } : {}),
    priority: "high",
  }));

  if (messages.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  // Batch: 100 tadan.
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE);
    const tickets = await sendBatch(chunk);
    const failedTokens = new Set<string>();

    tickets.forEach((ticket, index) => {
      const message = chunk[index];
      if (ticket.status === "ok") {
        sent += 1;
        return;
      }
      failed += 1;
      // DeviceNotRegistered -> token o'chirilgan qurilma: nofaol qilamiz.
      if (
        ticket.details?.error === "DeviceNotRegistered" ||
        ticket.message === "DeviceNotRegistered"
      ) {
        failedTokens.add(message.to);
      }
    });

    if (failedTokens.size > 0) {
      const result = await PushToken.updateMany(
        { token: { $in: Array.from(failedTokens) } },
        { isActive: false }
      );
      console.log(
        `[push] ${result.modifiedCount} ta o'chirilgan qurilma tokeni nofaol qilindi`
      );
    }
  }

  console.log(
    `[push] Kategoriya "${categoryName}" uchun ${sent} ta yuborildi, ${failed} ta muvaffaqiyatsiz`
  );
  return { sent, failed };
}

/**
 * Expo Push API'ga bitta batch (100 gacha) so'rov yuboradi.
 */
async function sendBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text();
        console.error(`[push] Expo API xato ${response.status}: ${text}`);
        // Butun batch muvaffaqiyatsiz deb hisoblanadi.
        return messages.map(() => ({
          status: "error",
          message: `HTTP ${response.status}`,
        }));
      }
      const json = (await response.json()) as { data?: ExpoPushTicket[] };
      return Array.isArray(json.data) ? json.data : [];
    } finally {
      clearTimeout(timer);
    }
  } catch (error: any) {
    console.error("[push] Expo so'rovda xato:", error?.message || error);
    return messages.map(() => ({ status: "error", message: "network" }));
  }
}
