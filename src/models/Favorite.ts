import mongoose, { Schema, Document } from "mongoose";

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  targetType: "ad" | "product";
  targetId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["ad", "product"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

favoriteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
favoriteSchema.index({ targetId: 1 });

const Favorite = mongoose.model<IFavorite>("Favorite", favoriteSchema);

export default Favorite;
