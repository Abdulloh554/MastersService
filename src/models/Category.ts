import mongoose, { Schema, Document } from "mongoose";

export interface ICategoryName {
  uz: string;
  ru: string;
  en: string;
  zhHans: string;
  zhHant: string;
}

export interface ICategory extends Document {
  name: ICategoryName;
  icon: string;
  type: "ad" | "product";
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const categoryNameSchema = new Schema<ICategoryName>(
  {
    uz: { type: String, required: true },
    ru: { type: String, required: true },
    en: { type: String, required: true },
    zhHans: { type: String, required: true },
    zhHant: { type: String, required: true },
  },
  { _id: false }
);

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: categoryNameSchema,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["ad", "product"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model<ICategory>("Category", categorySchema);

export default Category;
