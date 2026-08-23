import { Request, Response } from "express";
import Category from "../models/Category";

export const getCategories = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as "ad" | "product" | undefined;

    const filter: any = { isActive: true };
    if (type) {
      filter.type = type;
    }

    const categories = await Category.find(filter).sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};