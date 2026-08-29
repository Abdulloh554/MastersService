import mongoose, { Schema, Document } from "mongoose";

export type ModerationEntityType = "Ad" | "Product" | "Review";

export interface IModerationQueue extends Document {
  entityType: ModerationEntityType;
  entityId: mongoose.Types.ObjectId;
  moderationResult: {
    isSafe: boolean;
    categories: string[];
    confidence: number;
  };
  status: "pending" | "approved" | "rejected";
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const moderationQueueSchema = new Schema<IModerationQueue>(
  {
    entityType: {
      type: String,
      enum: ["Ad", "Product", "Review"],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    moderationResult: {
      isSafe: { type: Boolean, required: true },
      categories: [{ type: String }],
      confidence: { type: Number, required: true, min: 0, max: 1 },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

moderationQueueSchema.index({ status: 1 });
moderationQueueSchema.index({ entityType: 1, entityId: 1 });

const ModerationQueue = mongoose.model<IModerationQueue>(
  "ModerationQueue",
  moderationQueueSchema
);

export default ModerationQueue;
