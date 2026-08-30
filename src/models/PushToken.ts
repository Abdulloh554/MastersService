import mongoose, { Schema, Document } from "mongoose";

/**
 * Expo push token — bir foydalanuvchining bir qurilmasi uchun.
 * Bitta userId -> bir nechta token (telefon, planshet va h.k.).
 */
export interface IPushToken extends Document {
  userId: mongoose.Types.ObjectId;
  /** Expo push token (ExponentPushToken[....]). */
  token: string;
  /** "ios" | "android" | "web". */
  platform: string;
  /** Ushbu qurilmada bildirishnoma olishga obuna bo'lingan kategoriyalar. */
  categoryIds: mongoose.Types.ObjectId[];
  /** Expo "DeviceNotRegistered" qaytarsa false qilinadi. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pushTokenSchema = new Schema<IPushToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android", "web"],
      required: true,
      default: "android",
    },
    categoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
        default: [],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

pushTokenSchema.index({ userId: 1, isActive: 1 });

const PushToken = mongoose.model<IPushToken>("PushToken", pushTokenSchema);

export default PushToken;
