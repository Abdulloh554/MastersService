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

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate("fromUser", "firstName lastName avatar")
      .populate("toUser", "firstName lastName avatar")
      .populate("relatedAd", "title")
      .populate("relatedProduct", "name")
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 }),
    Transaction.countDocuments(filter),
  ]);

  return {
    transactions,
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
