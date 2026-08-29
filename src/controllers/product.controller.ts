import { Request, Response, NextFunction } from "express";
import * as productService from "../services/product.service";

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await productService.createProduct(
      req.user!.userId,
      req.body,
      req.moderatedResult
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

    const result = await productService.getProducts(page, limit, {
      category,
      search,
      minPrice,
      maxPrice,
    });

    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await productService.getProductById(String(req.params.id));

    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await productService.updateProduct(
      String(req.params.id),
      req.user!.userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await productService.deleteProduct(String(req.params.id), req.user!.userId);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getSellerProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await productService.getSellerProducts(
      req.user!.userId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      message: "Seller products retrieved successfully",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const checkoutProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await productService.checkoutProduct(
      String(req.params.id),
      req.user!.userId
    );

    res.status(200).json({
      success: true,
      message: "Product purchased successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
