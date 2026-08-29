import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  sellerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  descriptionTranslations?: {
    uz?: string;
    ru?: string;
    en?: string;
  };
  tags?: string[];
  category: mongoose.Types.ObjectId;
  price: number;
  images: string[];
  stock: number;
  isActive: boolean;
  moderation?: {
    isSafe: boolean;
    confidence: number;
    status: "none" | "pending_review";
    flaggedCategories: string[];
  };
  favorites: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    descriptionTranslations: {
      uz: { type: String, default: "" },
      ru: { type: String, default: "" },
      en: { type: String, default: "" },
    },
    tags: [{ type: String }],
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    images: [
      {
        type: String,
      },
    ],
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    moderation: {
      isSafe: { type: Boolean, default: true },
      confidence: { type: Number, default: 1 },
      status: {
        type: String,
        enum: ["none", "pending_review"],
        default: "none",
      },
      flaggedCategories: [{ type: String }],
    },
    favorites: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

productSchema.index({ sellerId: 1 });
productSchema.index({ category: 1 });

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;
