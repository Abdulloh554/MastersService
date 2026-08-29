import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  adId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  masterId: mongoose.Types.ObjectId;
  amount: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    adId: {
      type: Schema.Types.ObjectId,
      ref: "Ad",
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    masterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ masterId: 1, status: 1 });
orderSchema.index({ clientId: 1, status: 1 });
orderSchema.index({ adId: 1 });

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
