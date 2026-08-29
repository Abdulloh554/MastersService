import mongoose from "mongoose";
import Transaction from "../models/Transaction";
import User from "../models/User";
import { paginate } from "../utils/helpers";

const SUMMARY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — summary narxi yumshab turadi
const SUMMARY_CACHE_MAX = 5000; // cheksiz o'sishni bloklash uchun sig'im cheki
const summaryCache = new Map<
  string,
  { at: number; value: { totalCredit: number; totalDebit: number } }
>();

const computeSummary = async (userId: string) => {
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const [row] = await Transaction.aggregate([
    { $match: { $or: [{ fromUser: userId }, { toUser: userId }] } },
    {
      $project: {
        amount: 1,
        isCredit: {
          $and: [
            { $ne: ["$type", "acceptance_fee"] },
            { $eq: [{ $ifNull: ["$toUser", null] }, objectUserId] },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalCredit: { $sum: { $cond: ["$isCredit", "$amount", 0] } },
        totalDebit: { $sum: { $cond: ["$isCredit", 0, "$amount"] } },
      },
    },
  ]);
  return { totalCredit: row?.totalCredit || 0, totalDebit: row?.totalDebit || 0 };
};

const getSummary = async (userId: string) => {
  // 1M'da foydalanuvchi tranzaksiyalari ko'paysa, har sahifa ochganda butun
  // tarixni $group qilish qimmat bo'ladi. 5 daqiqalik kesh bu yo'ldagi takroriy
  // yukni kesadi; yakuniy yechim — User'ga denormal totalIn/totalOut (AUDIT P3).
  const now = Date.now();
  const hit = summaryCache.get(userId);
  if (hit && now - hit.at < SUMMARY_CACHE_TTL_MS) return hit.value;

  const value = await computeSummary(userId);

  if (summaryCache.size >= SUMMARY_CACHE_MAX) {
    const oldest = summaryCache.keys().next().value as string | undefined;
    if (oldest) summaryCache.delete(oldest);
  }
  summaryCache.set(userId, { at: now, value });
  return value;
};

export const getTransactions = async (
  userId: string,
  page: number = 1,
  limit: number = 20
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter = {
    $or: [{ fromUser: userId }, { toUser: userId }],
  };

  // Direction mirrors the mobile mapper: a transaction is a credit for the
  // viewer when it is paid *to* them and is not an acceptance fee; everything
  // else (money out, acceptance fees) is a debit.
  const [transactions, total, summary] = await Promise.all([
    Transaction.find(filter)
      .populate("fromUser", "firstName lastName avatar")
      .populate("toUser", "firstName lastName avatar")
      .populate("relatedAd", "title")
      .populate("relatedProduct", "name")
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 })
      .lean(),
    Transaction.countDocuments(filter),
    getSummary(userId),
  ]);

  return {
    transactions,
    summary,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};;

export const getBalance = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    return { balance: 0 };
  }
  return { balance: user.balance };
};

export const createTransaction = async (data: {
  fromUser: string;
  toUser: string;
  amount: number;
  type: "service_payment" | "product_sale" | "registration_bonus";
  relatedAd?: string;
  relatedOrder?: string;
  relatedProduct?: string;
}) => {
  const transaction = await Transaction.create(data);
  return transaction;
};
