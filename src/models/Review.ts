import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  authorId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  rating: number;
  text: string;
  sentimentScore: number;
  isSuspicious: boolean;
  sentimentReasons: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    sentimentScore: {
      type: Number,
      default: 0,
      min: -1,
      max: 1,
    },
    isSuspicious: {
      type: Boolean,
      default: false,
    },
    sentimentReasons: [{ type: String }],
  },
  { timestamps: true }
);

reviewSchema.index({ targetUserId: 1, createdAt: -1 });
reviewSchema.index({ authorId: 1 });

const Review = mongoose.model<IReview>("Review", reviewSchema);

export default Review;
