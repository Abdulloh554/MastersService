import mongoose from "mongoose";
import Ad from "../models/Ad";
import Order from "../models/Order";
import Transaction from "../models/Transaction";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/helpers";

export const createAd = async (
  clientId: string,
  data: {
    title: string;
    description: string;
    category: string;
    budget: number;
    images?: string[];
    location: { address: string; lat: number; lng: number };
  }
) => {
  const ad = await Ad.create({
    clientId,
    title: data.title,
    description: data.description,
    category: data.category,
    budget: data.budget,
    images: data.images || [],
    location: data.location,
    status: "active",
  });

  return ad;
};

export const getAds = async (
  page: number = 1,
  limit: number = 20,
  filters?: {
    category?: string;
    status?: string;
    minBudget?: number;
    maxBudget?: number;
    search?: string;
  }
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter: any = {};

  if (filters?.category) {
    filter.category = filters.category;
  }

  if (filters?.status) {
    filter.status = filters.status;
  }

  if (filters?.minBudget !== undefined || filters?.maxBudget !== undefined) {
    filter.budget = {};
    if (filters.minBudget !== undefined) {
      filter.budget.$gte = filters.minBudget;
    }
    if (filters.maxBudget !== undefined) {
      filter.budget.$lte = filters.maxBudget;
    }
  }

  if (filters?.search) {
    filter.$or = [
      { title: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
    ];
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

export const getAdById = async (adId: string) => {
  const ad = await Ad.findById(adId)
    .populate("clientId", "firstName lastName avatar phone")
    .populate("category")
    .populate("acceptedBy", "firstName lastName avatar phone");

  if (!ad) {
    throw AppError.notFound("Ad not found");
  }

  return ad;
};

export const updateAd = async (
  adId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    category?: string;
    budget?: number;
    images?: string[];
    location?: { address: string; lat: number; lng: number };
  }
) => {
  const ad = await Ad.findById(adId);

  if (!ad) {
    throw AppError.notFound("Ad not found");
  }

  if (ad.clientId.toString() !== userId) {
    throw AppError.forbidden("You can only update your own ads");
  }

  if (ad.status !== "active" && ad.status !== "pending") {
    throw AppError.badRequest("Cannot update ad in current status");
  }

  const updatedAd = await Ad.findByIdAndUpdate(adId, data, {
    new: true,
    runValidators: true,
  })
    .populate("clientId", "firstName lastName avatar")
    .populate("category");

  return updatedAd;
};

export const deleteAd = async (adId: string, userId: string) => {
  const ad = await Ad.findById(adId);

  if (!ad) {
    throw AppError.notFound("Ad not found");
  }

  if (ad.clientId.toString() !== userId) {
    throw AppError.forbidden("You can only delete your own ads");
  }

  if (ad.status === "accepted") {
    throw AppError.badRequest("Cannot delete an accepted ad");
  }

  await Ad.findByIdAndDelete(adId);
};

export const acceptAd = async (
  adId: string,
  masterId: string
) => {
  const master = await User.findById(masterId);
  if (!master || master.role !== "master") {
    throw AppError.forbidden("Only masters can accept ads");
  }

  // Atomic transition active -> accepted so two concurrent masters
  // cannot both claim the same ad.
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const ad = await Ad.findOneAndUpdate(
        { _id: adId, status: "active" },
        { $set: { status: "accepted", acceptedBy: masterId } },
        { new: true }
      ).session(session);

      if (!ad) {
        const exists = await Ad.exists({ _id: adId }).session(session);
        if (!exists) {
          throw AppError.notFound("Ad not found");
        }

        const ownAd = await Ad.exists({
          _id: adId,
          clientId: masterId,
        }).session(session);
        if (ownAd) {
          throw AppError.badRequest("You cannot accept your own ad");
        }

        throw AppError.badRequest("Ad is not available for acceptance");
      }

      const [order] = await Order.create(
        [
          {
            adId: ad._id,
            clientId: ad.clientId,
            masterId: masterId,
            amount: ad.budget,
            status: "pending",
          },
        ],
        { session }
      );

      return { ad, order };
    });
  } finally {
    await session.endSession();
  }
};

export const completeAd = async (
  adId: string,
  userId: string
) => {
  // Runs in a transaction with atomic conditional updates so a
  // double-complete cannot pay out the budget twice.
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      // Atomic status transition: succeeds only once per ad.
      const ad = await Ad.findOneAndUpdate(
        { _id: adId, status: "accepted" },
        { $set: { status: "completed" } },
        { new: true }
      ).session(session);

      if (!ad) {
        const exists = await Ad.exists({ _id: adId }).session(session);
        if (!exists) {
          throw AppError.notFound("Ad not found");
        }
        throw AppError.badRequest("Ad is not in accepted status");
      }

      const isParticipant =
        ad.acceptedBy?.toString() === userId ||
        ad.clientId.toString() === userId;
      if (!isParticipant) {
        throw AppError.forbidden(
          "Only the accepted master or client can complete this ad"
        );
      }

      const order = await Order.findOneAndUpdate(
        { adId: ad._id, status: { $ne: "completed" } },
        { $set: { status: "completed", completedAt: new Date() } },
        { new: true }
      ).session(session);

      let masterCredited = false;
      if (ad.acceptedBy) {
        const credit = await User.updateOne(
          { _id: ad.acceptedBy },
          { $inc: { balance: ad.budget } }
        ).session(session);
        masterCredited = credit.modifiedCount > 0;
      }

      const [transaction] = await Transaction.create(
        [
          {
            fromUser: ad.clientId,
            toUser: ad.acceptedBy,
            amount: ad.budget,
            type: "service_payment",
            relatedAd: ad._id,
            relatedOrder: order?._id,
            status: "completed",
          },
        ],
        { session }
      );

      return { ad, order, transaction, masterCredited };
    });
  } finally {
    await session.endSession();
  }
};

export const cancelAd = async (adId: string, userId: string) => {
  const ad = await Ad.findById(adId);

  if (!ad) {
    throw AppError.notFound("Ad not found");
  }

  if (ad.clientId.toString() !== userId && ad.acceptedBy?.toString() !== userId) {
    throw AppError.forbidden("Only the client or accepted master can cancel this ad");
  }

  if (ad.status === "completed") {
    throw AppError.badRequest("Cannot cancel a completed ad");
  }

  if (ad.status === "cancelled") {
    throw AppError.badRequest("Ad is already cancelled");
  }

  ad.status = "cancelled";
  await ad.save();

  const order = await Order.findOne({ adId: ad._id });
  if (order && order.status !== "cancelled") {
    order.status = "cancelled";
    await order.save();
  }

  return ad;
};

export const getMyAds = async (
  clientId: string,
  page: number = 1,
  limit: number = 20
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter = { clientId };

  const [ads, total] = await Promise.all([
    Ad.find(filter)
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
