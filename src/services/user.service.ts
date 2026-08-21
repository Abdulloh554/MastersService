import User from "../models/User";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/helpers";

export const getProfile = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("User not found");
  }
  return user;
};

export const updateProfile = async (
  userId: string,
  data: { firstName?: string; lastName?: string; email?: string }
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("User not found");
  }

  if (data.email && data.email !== user.email) {
    const existingEmail = await User.findOne({
      email: data.email,
      _id: { $ne: userId },
    });
    if (existingEmail) {
      throw AppError.conflict("Email already in use");
    }
  }

  const updatedUser = await User.findByIdAndUpdate(userId, data, {
    new: true,
    runValidators: true,
  });

  return updatedUser;
};

export const updateAvatar = async (userId: string, avatarUrl: string) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: avatarUrl },
    { new: true }
  );

  if (!user) {
    throw AppError.notFound("User not found");
  }

  return user;
};

export const updateLanguage = async (
  userId: string,
  language: string
) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { language },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw AppError.notFound("User not found");
  }

  return user;
};

export const updateTheme = async (userId: string, theme: string) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { theme },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw AppError.notFound("User not found");
  }

  return user;
};

export const getMasterProfile = async (masterId: string) => {
  const master = await User.findOne({
    _id: masterId,
    role: "master",
  });

  if (!master) {
    throw AppError.notFound("Master not found");
  }

  return master;
};

export const getUserById = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("User not found");
  }
  return user;
};

export const getAllUsers = async (
  page: number = 1,
  limit: number = 20,
  search?: string,
  role?: string
) => {
  const { skip, limit: safeLimit, page: safePage } = paginate(page, limit);

  const filter: any = {};

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) {
    filter.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(safeLimit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};
