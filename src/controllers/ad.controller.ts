import { Request, Response, NextFunction } from "express";
import * as adService from "../services/ad.service";
import { mark } from "../middleware/perfProfiler.middleware";

export const createAd = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ad = await adService.createAd(req.user!.userId, req.body, req.moderatedResult);

    res.status(201).json({
      success: true,
      message: "Ad created successfully",
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};

export const getAds = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    mark(req, "middleware tugadi");
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;
    const minBudget = req.query.minBudget ? Number(req.query.minBudget) : undefined;
    const maxBudget = req.query.maxBudget ? Number(req.query.maxBudget) : undefined;
    const search = req.query.search as string | undefined;

    const result = await adService.getAds(page, limit, {
      category,
      status,
      minBudget,
      maxBudget,
      search,
    });
    mark(req, "DB so'rov tugadi");

    res.status(200).json({
      success: true,
      message: "Ads retrieved successfully",
      data: result.ads,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ad = await adService.getAdById(String(req.params.id));

    res.status(200).json({
      success: true,
      message: "Ad retrieved successfully",
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAd = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ad = await adService.updateAd(
      String(req.params.id),
      req.user!.userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Ad updated successfully",
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAd = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await adService.deleteAd(String(req.params.id), req.user!.userId);

    res.status(200).json({
      success: true,
      message: "Ad deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const acceptAd = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await adService.acceptAd(
      String(req.params.id),
      req.user!.userId
    );

    res.status(200).json({
      success: true,
      message: "Ad accepted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const completeAd = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await adService.completeAd(
      String(req.params.id),
      req.user!.userId
    );

    res.status(200).json({
      success: true,
      message: "Ad completed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelAd = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ad = await adService.cancelAd(String(req.params.id), req.user!.userId);

    res.status(200).json({
      success: true,
      message: "Ad cancelled successfully",
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAds = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await adService.getMyAds(
      req.user!.userId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      message: "My ads retrieved successfully",
      data: result.ads,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
