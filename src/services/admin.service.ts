import User from "../models/User";
import Ad from "../models/Ad";
import Order from "../models/Order";
import Product from "../models/Product";
import Transaction from "../models/Transaction";
import Category from "../models/Category";
import { paginate } from "../utils/helpers";
import { AppError } from "../utils/AppError";

export const getDashboardStats = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  const [
    totalUsers,
    totalMasters,
    totalClients,
    totalSellers,
    totalAds,
    activeAds,
    totalOrders,
    completedOrders,
    totalProducts,
    activeProducts,
    totalRevenue,
    monthlyRevenueAgg,
    recentOrdersRaw,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "master" }),
    User.countDocuments({ role: "client" }),
    User.countDocuments({ role: "seller" }),
    Ad.countDocuments(),
    Ad.countDocuments({ status: "active" }),
    Order.countDocuments(),
    Order.countDocuments({ status: "completed" }),
    Product.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Transaction.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate<{ adId: { title: string } | null }>("adId", "title"),
  ]);

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const found = monthlyRevenueAgg.find(
      (m) =>
        m._id.year === d.getFullYear() && m._id.month === d.getMonth() + 1
    );
    monthlyRevenue.push({
      month: monthNames[d.getMonth()],
      amount: found ? found.total : 0,
    });
  }

  const recentOrders = recentOrdersRaw.map((o) => ({
    id: String(o._id),
    status: o.status,
    amount: o.amount,
    createdAt: o.createdAt,
    ad:
      o.adId && (o.adId as { title?: string }).title
        ? { title: (o.adId as { title: string }).title }
        : null,
  }));

  return {
    users: {
      total: totalUsers,
      masters: totalMasters,
      clients: totalClients,
      sellers: totalSellers,
    },
    ads: {
      total: totalAds,
      active: activeAds,
    },
    orders: {
      total: totalOrders,
      completed: completedOrders,
    },
    products: {
      total: totalProducts,
      active: activeProducts,
    },
    revenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
    monthlyRevenue,
    recentOrders,
  };
};

export const getAllUsers = async (
  page: number = 1,
  limit: number = 20,
  search?: string,
  role?: string
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter: any = {};

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) {
    filter.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(safeLimit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const updateUserStatus = async (
  userId: string,
  isActive: boolean
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw AppError.notFound("User not found");
  }

  if (user.role === "admin") {
    throw AppError.forbidden("Cannot modify admin status");
  }

  user.isActive = isActive;
  await user.save();

  return user;
};

export const deleteUser = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw AppError.notFound("User not found");
  }

  if (user.role === "admin") {
    throw AppError.forbidden("Cannot delete admin users");
  }

  await User.findByIdAndDelete(userId);
};

export const getAllAds = async (
  page: number = 1,
  limit: number = 20,
  status?: string
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter: any = {};
  if (status) {
    filter.status = status;
  }

  const [ads, total] = await Promise.all([
    Ad.find(filter)
      .populate("clientId", "firstName lastName avatar")
      .populate("category")
      .populate("acceptedBy", "firstName lastName avatar")
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 }),
    Ad.countDocuments(filter),
  ]);

  return {
    ads,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const deleteAd = async (adId: string) => {
  const ad = await Ad.findById(adId);
  if (!ad) {
    throw AppError.notFound("Ad not found");
  }
  await Ad.findByIdAndDelete(adId);
};

export const getAllProducts = async (
  page: number = 1,
  limit: number = 20,
  search?: string
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter: any = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("sellerId", "firstName lastName avatar")
      .populate("category")
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 }),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const deleteProduct = async (productId: string) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw AppError.notFound("Product not found");
  }
  await Product.findByIdAndDelete(productId);
};

export const getAllOrders = async (
  page: number = 1,
  limit: number = 20,
  status?: string
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter: any = {};
  if (status) {
    filter.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("adId", "title description budget")
      .populate("clientId", "firstName lastName avatar")
      .populate("masterId", "firstName lastName avatar")
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const getAllTransactions = async (
  page: number = 1,
  limit: number = 20,
  type?: string
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter: any = {};
  if (type) {
    filter.type = type;
  }

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

export const getReports = async (period: "day" | "week" | "month" | "year") => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "day":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  const revenue = await Transaction.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        transactionCount: { $sum: 1 },
      },
    },
  ]);

  const usersByPeriod = await User.countDocuments({
    createdAt: { $gte: startDate },
  });

  const adsByPeriod = await Ad.countDocuments({
    createdAt: { $gte: startDate },
  });

  return {
    period,
    startDate,
    endDate: now,
    revenue: revenue.length > 0 ? revenue[0].totalRevenue : 0,
    transactionCount: revenue.length > 0 ? revenue[0].transactionCount : 0,
    newUsers: usersByPeriod,
    newAds: adsByPeriod,
  };
};

export const getCategories = async (type?: string) => {
  const filter: any = {};
  if (type) {
    filter.type = type;
  }
  const categories = await Category.find(filter).sort({ order: 1 });
  return categories;
};

export const createCategory = async (data: {
  name: { uz: string; ru: string; en: string; zhHans: string; zhHant: string };
  icon: string;
  type: "ad" | "product";
  order?: number;
}) => {
  const category = await Category.create(data);
  return category;
};

export const updateCategory = async (
  categoryId: string,
  data: {
    name?: { uz: string; ru: string; en: string; zhHans: string; zhHant: string };
    icon?: string;
    type?: "ad" | "product";
    isActive?: boolean;
    order?: number;
  }
) => {
  const category = await Category.findByIdAndUpdate(categoryId, data, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    throw AppError.notFound("Category not found");
  }

  return category;
};

export const deleteCategory = async (categoryId: string) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw AppError.notFound("Category not found");
  }
  await Category.findByIdAndDelete(categoryId);
};
