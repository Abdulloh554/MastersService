import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userService.getProfile(req.user!.userId);

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userService.updateProfile(req.user!.userId, req.body);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { avatarUrl } = req.body;
    const user = await userService.updateAvatar(req.user!.userId, avatarUrl);

    res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLanguage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { language } = req.body;
    const user = await userService.updateLanguage(req.user!.userId, language);

    res.status(200).json({
      success: true,
      message: "Language updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTheme = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { theme } = req.body;
    const user = await userService.updateTheme(req.user!.userId, theme);

    res.status(200).json({
      success: true,
      message: "Theme updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getMasterProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const master = await userService.getMasterProfile(String(req.params.id));

    res.status(200).json({
      success: true,
      message: "Master profile retrieved successfully",
      data: master,
    });
  } catch (error) {
    next(error);
  }
};
