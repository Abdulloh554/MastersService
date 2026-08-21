import { Document } from "mongoose";

export enum UserRole {
  CLIENT = "client",
  MASTER = "master",
  SELLER = "seller",
  ADMIN = "admin",
}

export enum LanguageCode {
  UZ = "uz",
  RU = "ru",
  EN = "en",
  ZH_HANS = "zh-Hans",
  ZH_HANT = "zh-Hant",
}

export enum ThemeMode {
  LIGHT = "light",
  DARK = "dark",
  SYSTEM = "system",
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
  avatar?: string;
  balance: number;
  language: LanguageCode;
  theme: ThemeMode;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
