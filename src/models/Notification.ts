import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  type: string;
  data: {
    adId?: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    productId?: mongoose.Types.ObjectId;
  };
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["order", "ad", "product", "system"],
      default: "system",
    },
    data: {
      adId: { type: Schema.Types.ObjectId, ref: "Ad" },
      orderId: { type: Schema.Types.ObjectId, ref: "Order" },
      productId: { type: Schema.Types.ObjectId, ref: "Product" },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

export default Notification;
