import User from "../models/User";
import RefreshToken from "../models/RefreshToken";
import { UserRole } from "../types/user.types";
import { AppError } from "../utils/AppError";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from "../utils/helpers";
import { JwtPayload } from "../types/api.types";
import { config } from "../config";
import crypto from "crypto";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const generateTokenPair = async (
  payload: JwtPayload,
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<TokenPair> => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const hash = hashToken(refreshToken);
  const familyId = crypto.randomUUID();

  await RefreshToken.create({
    hash,
    userId,
    familyId,
    expiresAt: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ),
    userAgent,
    ipAddress,
  });

  return { accessToken, refreshToken };
};

export const register = async (
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
    role: string;
  },
  userAgent?: string,
  ipAddress?: string
) => {
  const normalizedPhone = data.phone.length === 9 ? `+998${data.phone}` : data.phone.replace(/\s/g, '');

  const existingUser = await User.findOne({
    $or: [{ phone: normalizedPhone }],
  });

  if (existingUser) {
    if (existingUser.phone === normalizedPhone) {
      throw AppError.conflict("Phone number already registered");
    }
  }

  const user = await User.create({
    firstName: data.firstName,
    lastName: data.lastName,
    phone: normalizedPhone,
    password: data.password,
    role: data.role,
    balance: data.role === UserRole.MASTER ? 100000 : 0,
  });

  const jwtPayload: JwtPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const tokens = await generateTokenPair(
    jwtPayload,
    user._id.toString(),
    userAgent,
    ipAddress
  );

  return {
    user,
    ...tokens,
  };
};

export const login = async (
  phone: string,
  password: string,
  userAgent?: string,
  ipAddress?: string
) => {
  const normalizedPhone = phone.length === 9 ? `+998${phone}` : phone.replace(/\s/g, '');
  const user = await User.findOne({ phone: normalizedPhone }).select("+password");

  if (!user) {
    throw AppError.unauthorized("Invalid phone number or password");
  }

  if (!user.isActive) {
    throw AppError.forbidden("Account has been deactivated");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw AppError.unauthorized("Invalid phone number or password");
  }

  const jwtPayload: JwtPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const tokens = await generateTokenPair(
    jwtPayload,
    user._id.toString(),
    userAgent,
    ipAddress
  );

  return {
    user,
    ...tokens,
  };
};

export const refreshTokens = async (
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string
) => {
  const decoded = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const storedToken = await RefreshToken.findOne({ hash: tokenHash });

  if (!storedToken) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  if (storedToken.revokedAt) {
    await RefreshToken.deleteMany({ familyId: storedToken.familyId });
    throw AppError.unauthorized("Refresh token reuse detected");
  }

  if (new Date() > storedToken.expiresAt) {
    throw AppError.unauthorized("Refresh token expired");
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const jwtPayload: JwtPayload = {
    userId: decoded.userId,
    role: decoded.role,
  };

  const tokens = await generateTokenPair(
    jwtPayload,
    decoded.userId,
    userAgent,
    ipAddress
  );

  return tokens;
};

export const logout = async (refreshToken: string) => {
  const tokenHash = hashToken(refreshToken);
  await RefreshToken.findOneAndUpdate(
    { hash: tokenHash },
    { revokedAt: new Date() }
  );
};

export const updateRole = async (userId: string, role: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("User not found");
  }

  const wasMaster = user.role === "master";
  user.role = role as any;

  // Grant the signup bonus only on the first switch to master,
  // not every time the endpoint is called.
  if (role === "master" && !wasMaster) {
    user.balance = Math.max(user.balance, 100000);
  }
  await user.save();

  return user;
};
