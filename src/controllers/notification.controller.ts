import { Request, Response, NextFunction } from "express";
import * as notificationService from "../services/notification.service";

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit } = req.query;
    const result = await notificationService.getNotifications(
      req.user!.userId,
      Number(page) || 1,
      Number(limit) || 20
    );

    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await notificationService.getUnreadCount(req.user!.userId);

    res.status(200).json({
      success: true,
      message: "Unread count retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const notification = await notificationService.markAsRead(
      req.user!.userId,
      String(req.params.id)
    );

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await notificationService.markAllAsRead(req.user!.userId);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
