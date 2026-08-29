import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import { IUser, UserRole, LanguageCode, ThemeMode } from "../types/user.types";
import { config } from "../config";

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.CLIENT,
    },
    avatar: {
      type: String,
      default: null,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    language: {
      type: String,
      enum: Object.values(LanguageCode),
      default: LanguageCode.UZ,
    },
    theme: {
      type: String,
      enum: Object.values(ThemeMode),
      default: ThemeMode.SYSTEM,
    },
    bioTranslations: {
      uz: { type: String, default: "" },
      ru: { type: String, default: "" },
      en: { type: String, default: "" },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1, isActive: 1, createdAt: -1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model<IUser>("User", userSchema);

export default User;
