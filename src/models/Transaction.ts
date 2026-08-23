import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  fromUser: mongoose.Types.ObjectId;
  toUser: mongoose.Types.ObjectId;
  amount: number;
  type:
    | "service_payment"
    | "product_sale"
    | "registration_bonus"
    | "acceptance_fee";
  relatedAd?: mongoose.Types.ObjectId;
  relatedOrder?: mongoose.Types.ObjectId;
  relatedProduct?: mongoose.Types.ObjectId;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: [
        "service_payment",
        "product_sale",
        "registration_bonus",
        "acceptance_fee",
      ],
      required: true,
    },
    relatedAd: {
      type: Schema.Types.ObjectId,
      ref: "Ad",
      default: null,
    },
    relatedOrder: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    relatedProduct: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ toUser: 1 });
transactionSchema.index({ fromUser: 1 });

const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema
);

export default Transaction;
