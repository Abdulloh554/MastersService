import Notification from "../models/Notification";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/helpers";

interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type?: "order" | "ad" | "product" | "system";
  data?: {
    adId?: string;
    orderId?: string;
    productId?: string;
  };
}

export const createNotification = async (input: CreateNotificationInput) => {
  // Notifications are best-effort; never let them break the main flow.
  try {
    return await Notification.create({
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type || "system",
      data: input.data || {},
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
};

export const getNotifications = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  notifications: Array<Record<string, unknown>>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const [notifications, total] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Notification.countDocuments({ userId }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      ...n,
      id: String(n._id),
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

export const getUnreadCount = async (userId: string) => {
  const count = await Notification.countDocuments({ userId, isRead: false });
  return { count };
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw AppError.notFound("Notification not found");
  }

  return notification;
};

export const markAllAsRead = async (userId: string) => {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
};
