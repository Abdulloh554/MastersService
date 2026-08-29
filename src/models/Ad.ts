import mongoose, { Schema, Document } from "mongoose";

export interface IAd extends Document {
  clientId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: mongoose.Types.ObjectId;
  images: string[];
  budget: number;
  status: "pending" | "active" | "accepted" | "completed" | "cancelled";
  acceptedBy?: mongoose.Types.ObjectId;
  moderation?: {
    isSafe: boolean;
    confidence: number;
    status: "none" | "pending_review";
    flaggedCategories: string[];
  };
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const adSchema = new Schema<IAd>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
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
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    budget: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "active", "accepted", "completed", "cancelled"],
      default: "pending",
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
    location: {
      address: { type: String, required: false, default: '' },
      lat: { type: Number, required: false, default: 41.311081 },
      lng: { type: Number, required: false, default: 69.240562 },
    },
  },
  {
    timestamps: true,
  }
);

adSchema.index({ status: 1 });
adSchema.index({ clientId: 1 });

const Ad = mongoose.model<IAd>("Ad", adSchema);

export default Ad;
