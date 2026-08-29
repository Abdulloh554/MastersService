import { Request, Response, NextFunction } from "express";
import * as reviewService from "../services/review.service";

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const review = await reviewService.createReview({
      authorId: req.user!.userId,
      targetUserId: req.body.targetUserId,
      rating: req.body.rating,
      text: req.body.text,
    });

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewsForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await reviewService.getReviewsForUser(String(req.params.userId));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
