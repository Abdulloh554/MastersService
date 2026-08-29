import mongoose from "mongoose";
import Transaction from "../models/Transaction";
import User from "../models/User";
import { paginate } from "../utils/helpers";

export const getTransactions = async (
  userId: string,
  page: number = 1,
  limit: number = 20
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter = {
    $or: [{ fromUser: userId }, { toUser: userId }],
  };

  const objectUserId = new mongoose.Types.ObjectId(userId);

  // Direction mirrors the mobile mapper: a transaction is a credit for the
  // viewer when it is paid *to* them and is not an acceptance fee; everything
  // else (money out, acceptance fees) is a debit. Compute the totals over the
  // *full* set of the user's transactions, not just the current page, so the
  // earnings summary is never limited to the items loaded so far.
  const [transactions, total, summaryAgg] = await Promise.all([
    Transaction.find(filter)
      .populate("fromUser", "firstName lastName avatar")
      .populate("toUser", "firstName lastName avatar")
      .populate("relatedAd", "title")
      .populate("relatedProduct", "name")
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 }),
    Transaction.countDocuments(filter),
    Transaction.aggregate([
      { $match: filter },
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
    ]),
  ]);

  const summaryAggRow = summaryAgg[0] || {};
  const summary = {
    totalCredit: summaryAggRow.totalCredit || 0,
    totalDebit: summaryAggRow.totalDebit || 0,
  };

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
};

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
