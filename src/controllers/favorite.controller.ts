import { Request, Response, NextFunction } from "express";
import * as favoriteService from "../services/favorite.service";

export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { targetType, targetId } = req.body;
    const favorite = await favoriteService.addFavorite(
      req.user!.userId,
      targetType,
      targetId
    );

    res.status(201).json({
      success: true,
      message: "Added to favorites",
      data: favorite,
    });
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const targetType = String(req.params.targetType);
    const targetId = String(req.params.targetId);
    await favoriteService.removeFavorite(
      req.user!.userId,
      targetType,
      targetId
    );

    res.status(200).json({
      success: true,
      message: "Removed from favorites",
    });
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const type = req.query.type as string | undefined;
    const favorites = await favoriteService.getFavorites(
      req.user!.userId,
      type
    );

    res.status(200).json({
      success: true,
      message: "Favorites retrieved successfully",
      data: favorites,
    });
  } catch (error) {
    next(error);
  }
};
