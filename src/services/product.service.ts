import Product from "../models/Product";
import Transaction from "../models/Transaction";
import User from "../models/User";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/helpers";

export const createProduct = async (
  sellerId: string,
  data: {
    name: string;
    description: string;
    category: string;
    price: number;
    stock: number;
    images?: string[];
  }
) => {
  const product = await Product.create({
    sellerId,
    name: data.name,
    description: data.description,
    category: data.category,
    price: data.price,
    stock: data.stock,
    images: data.images || [],
  });

  return product;
};

export const getProducts = async (
  page: number = 1,
  limit: number = 20,
  filters?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter: any = { isActive: true };

  if (filters?.category) {
    filter.category = filters.category;
  }

  if (filters?.search) {
    filter.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
    ];
  }

  if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
    filter.price = {};
    if (filters.minPrice !== undefined) {
      filter.price.$gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      filter.price.$lte = filters.maxPrice;
    }
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("sellerId", "firstName lastName avatar")
      .populate("category")
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 }),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const getProductById = async (productId: string) => {
  const product = await Product.findById(productId)
    .populate("sellerId", "firstName lastName avatar phone")
    .populate("category");

  if (!product) {
    throw AppError.notFound("Product not found");
  }

  return product;
};

export const updateProduct = async (
  productId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
    stock?: number;
    images?: string[];
    isActive?: boolean;
  }
) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw AppError.notFound("Product not found");
  }

  if (product.sellerId.toString() !== userId) {
    throw AppError.forbidden("You can only update your own products");
  }

  const updatedProduct = await Product.findByIdAndUpdate(productId, data, {
    new: true,
    runValidators: true,
  })
    .populate("sellerId", "firstName lastName avatar")
    .populate("category");

  return updatedProduct;
};

export const deleteProduct = async (productId: string, userId: string) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw AppError.notFound("Product not found");
  }

  if (product.sellerId.toString() !== userId) {
    throw AppError.forbidden("You can only delete your own products");
  }

  await Product.findByIdAndDelete(productId);
};

export const getSellerProducts = async (
  sellerId: string,
  page: number = 1,
  limit: number = 20
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter = { sellerId };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category")
      .skip(skip)
      .limit(safeLimit)
      .sort({ createdAt: -1 }),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const checkoutProduct = async (
  productId: string,
  buyerId: string
) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw AppError.notFound("Product not found");
  }

  if (!product.isActive) {
    throw AppError.badRequest("Product is not available");
  }

  if (product.stock <= 0) {
    throw AppError.badRequest("Product is out of stock");
  }

  if (product.sellerId.toString() === buyerId) {
    throw AppError.badRequest("You cannot purchase your own product");
  }

  const buyer = await User.findById(buyerId);
  if (!buyer) {
    throw AppError.notFound("Buyer not found");
  }

  if (buyer.balance < product.price) {
    throw AppError.badRequest("Insufficient balance");
  }

  buyer.balance -= product.price;
  await buyer.save();

  const seller = await User.findById(product.sellerId);
  if (seller) {
    seller.balance += product.price;
    await seller.save();
  }

  product.stock -= 1;
  if (product.stock === 0) {
    product.isActive = false;
  }
  await product.save();

  const transaction = await Transaction.create({
    fromUser: buyerId,
    toUser: product.sellerId,
    amount: product.price,
    type: "product_sale",
    relatedProduct: product._id,
    status: "completed",
  });

  return { product, transaction };
};
