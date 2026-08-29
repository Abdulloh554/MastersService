import mongoose, { Schema, Document } from "mongoose";

export type FraudEntityType = "Transaction" | "User";

export interface IFraudFlag extends Document {
  entityType: FraudEntityType;
  entityId: mongoose.Types.ObjectId;
  riskScore: number;
  reasons: string[];
  status: "pending" | "reviewed_ok" | "reviewed_fraud";
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fraudFlagSchema = new Schema<IFraudFlag>(
  {
    entityType: {
      type: String,
      enum: ["Transaction", "User"],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    reasons: [{ type: String }],
    status: {
      type: String,
      enum: ["pending", "reviewed_ok", "reviewed_fraud"],
      default: "pending",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

fraudFlagSchema.index({ status: 1 });
fraudFlagSchema.index({ entityType: 1, entityId: 1, status: 1 });

const FraudFlag = mongoose.model<IFraudFlag>("FraudFlag", fraudFlagSchema);

export default FraudFlag;
