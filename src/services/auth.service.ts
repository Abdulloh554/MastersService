import User from "../models/User";
import RefreshToken from "../models/RefreshToken";
import PasswordReset from "../models/PasswordReset";
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

  // Atomic rotation: revoke the used token while requiring it not already be
  // revoked, as a single findOneAndUpdate. This closes the TOCTOU race where
  // two concurrent refresh calls for the same token could both pass the
  // findOne check and each mint a fresh pair.
  const storedToken = await RefreshToken.findOneAndUpdate(
    { hash: tokenHash, revokedAt: null },
    { revokedAt: new Date() },
    { new: true }
  );

  if (!storedToken) {
    // Token is unknown or was already revoked. If the family is known, this is
    // token reuse — revoke every outstanding token in the family.
    const existing = await RefreshToken.findOne({ hash: tokenHash });
    if (existing?.familyId) {
      await RefreshToken.deleteMany({ familyId: existing.familyId });
    }
    throw AppError.unauthorized("Invalid refresh token");
  }

  if (new Date() > storedToken.expiresAt) {
    throw AppError.unauthorized("Refresh token expired");
  }

  // Re-fetch the user so the client always receives a fresh role/blocked
  // snapshot, and refuse to mint tokens for a deactivated account. The role in
  // the new tokens comes from the DB rather than the (possibly stale) JWT.
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw AppError.unauthorized("User no longer exists");
  }
  if (!user.isActive) {
    throw AppError.forbidden("Account has been deactivated");
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
    ...tokens,
    user,
  };
};

export const logout = async (refreshToken: string) => {
  const tokenHash = hashToken(refreshToken);
  await RefreshToken.findOneAndUpdate(
    { hash: tokenHash },
    { revokedAt: new Date() }
  );
};

const RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const generateResetCode = (): string => {
  // 6-digit numeric code (matches the mobile UI's numeric field).
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Starts the password-reset flow. Because no SMS gateway is wired up, the code
 * is returned in the response so the flow is usable end-to-end in dev/testing;
 * in production this would be delivered out-of-band (SMS/email) instead.
 */
export const requestPasswordReset = async (phone: string) => {
  const normalizedPhone = phone.length === 9
    ? `+998${phone}`
    : phone.replace(/\s/g, "");

  const user = await User.findOne({ phone: normalizedPhone });
  if (!user) {
    // Do not reveal whether a phone is registered.
    throw AppError.notFound("User not found");
  }

  const code = generateResetCode();
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);

  await PasswordReset.deleteMany({ userId: user._id });
  await PasswordReset.create({ userId: user._id, codeHash, expiresAt });

  return { code };
};

export const resetPassword = async (
  token: string,
  password: string
) => {
  const codeHash = hashToken(token);

  const reset = await PasswordReset.findOne({ codeHash });
  if (!reset) {
    throw AppError.unauthorized("Invalid or expired reset code");
  }
  if (reset.usedAt) {
    throw AppError.unauthorized("Reset code already used");
  }
  if (new Date() > reset.expiresAt) {
    throw AppError.unauthorized("Reset code expired");
  }

  const user = await User.findById(reset.userId);
  if (!user) {
    throw AppError.notFound("User not found");
  }

  user.password = password;
  await user.save();

  // The code is single-use, and any outstanding refresh tokens for this user
  // are revoked so other sessions are forced to re-login.
  reset.usedAt = new Date();
  await reset.save();
  await RefreshToken.deleteMany({ userId: user._id });

  return { success: true };
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
