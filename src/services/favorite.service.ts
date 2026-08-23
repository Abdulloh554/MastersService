import Favorite from "../models/Favorite";
import Ad from "../models/Ad";
import Product from "../models/Product";
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
    .sort({ createdAt: -1 })
    .lean();

  // Enrich each row with its target document so clients can render
  // cards without N+1 requests.
  const adIds = favorites
    .filter((f) => f.targetType === "ad")
    .map((f) => f.targetId);
  const productIds = favorites
    .filter((f) => f.targetType === "product")
    .map((f) => f.targetId);

  const [ads, products] = await Promise.all([
    adIds.length
      ? Ad.find({ _id: { $in: adIds } })
          .populate("category", "name icon")
          .select("title description budget images category createdAt")
          .lean()
      : Promise.resolve([]),
    productIds.length
      ? Product.find({ _id: { $in: productIds } })
          .populate("category", "name icon")
          .select("name description price images category isActive createdAt")
          .lean()
      : Promise.resolve([]),
  ]);

  const adMap = new Map(ads.map((a: any) => [String(a._id), a]));
  const productMap = new Map(products.map((p: any) => [String(p._id), p]));

  return favorites.map((f: any) => {
    const target =
      f.targetType === "ad" ? adMap.get(String(f.targetId)) : productMap.get(String(f.targetId));

    return {
      ...f,
      id: String(f._id),
      adId: f.targetType === "ad" ? String(f.targetId) : undefined,
      productId: f.targetType === "product" ? String(f.targetId) : undefined,
      ad: f.targetType === "ad" ? target ?? undefined : undefined,
      product: f.targetType === "product" ? target ?? undefined : undefined,
    };
  });
};
