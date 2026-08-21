import Order from "../models/Order";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/helpers";

export const getOrders = async (
  userId: string,
  role: string,
  page: number = 1,
  limit: number = 20
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  let filter: any = {};

  if (role === "client") {
    filter = { clientId: userId };
  } else if (role === "master") {
    filter = { masterId: userId };
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

export const getOrderById = async (orderId: string, userId: string, role: string) => {
  const order = await Order.findById(orderId)
    .populate("adId", "title description budget images location")
    .populate("clientId", "firstName lastName avatar phone")
    .populate("masterId", "firstName lastName avatar phone");

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  if (role !== "admin") {
    if (
      order.clientId._id.toString() !== userId &&
      order.masterId._id.toString() !== userId
    ) {
      throw AppError.forbidden("You do not have access to this order");
    }
  }

  return order;
};

export const updateOrderStatus = async (
  orderId: string,
  userId: string,
  role: string,
  status: string
) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  if (role !== "admin") {
    if (
      order.clientId.toString() !== userId &&
      order.masterId.toString() !== userId
    ) {
      throw AppError.forbidden("You do not have access to this order");
    }
  }

  if (order.status === "completed" || order.status === "cancelled") {
    throw AppError.badRequest("Cannot update order in current status");
  }

  order.status = status as any;

  if (status === "completed") {
    order.completedAt = new Date();
  }

  await order.save();

  return order;
};
