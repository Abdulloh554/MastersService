import Favorite from "../models/Favorite";
import { AppError } from "../utils/AppError";

export const addFavorite = async (
  userId: string,
  targetType: string,
  targetId: string
) => {
  const existing = await Favorite.findOne({
    userId,
    targetType,
    targetId,
  });

  if (existing) {
    throw AppError.conflict("Already in favorites");
  }

  const favorite = await Favorite.create({
    userId,
    targetType,
    targetId,
  });

  return favorite;
};

export const removeFavorite = async (
  userId: string,
  targetType: string,
  targetId: string
) => {
  const favorite = await Favorite.findOneAndDelete({
    userId,
    targetType,
    targetId,
  });

  if (!favorite) {
    throw AppError.notFound("Favorite not found");
  }

  return favorite;
};

export const getFavorites = async (
  userId: string,
  targetType?: string
) => {
  const filter: any = { userId };

  if (targetType) {
    filter.targetType = targetType;
  }

  const favorites = await Favorite.find(filter)
    .sort({ createdAt: -1 });

  return favorites;
};
