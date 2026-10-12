import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

const createTokens = (user) => ({
  accessToken: signAccessToken(user),
  refreshToken: signRefreshToken(user),
});

const issueTokens = async (user) => {
  const tokens = createTokens(user);
  const { refreshToken } = tokens;
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  return tokens;
};

const register = async (userData) => {
  const user = await User.create({
    ...userData,
    role: "SALES_EXECUTIVE",
    userStatus: "ACTIVE",
  });
  return User.findById(user._id)
    .select("name email phone role userStatus createdAt updatedAt")
    .lean();
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password +tokenVersion");
  if (!user || !(await user.comparePassword(password))) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }
  if (user.userStatus !== "ACTIVE") {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }
  const tokens = await issueTokens(user);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      userStatus: user.userStatus,
    },
    ...tokens,
  };
};

const refresh = async (token) => {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      const unauthorized = new Error("Invalid or expired refresh token");
      unauthorized.statusCode = 401;
      throw unauthorized;
    }
    throw error;
  }

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    _id: payload.sub,
    refreshTokenHash: tokenHash,
    tokenVersion: payload.version,
    userStatus: "ACTIVE",
  }).select("+refreshTokenHash +tokenVersion");
  if (!user) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  const nextTokens = createTokens(user);
  const result = await User.updateOne(
    {
      _id: user._id,
      refreshTokenHash: tokenHash,
      tokenVersion: payload.version,
      userStatus: "ACTIVE",
    },
    { $set: { refreshTokenHash: hashToken(nextTokens.refreshToken) } },
  );
  if (result.modifiedCount !== 1) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }
  return nextTokens;
};

const logout = async (userId) => {
  await User.updateOne(
    { _id: userId },
    { $inc: { tokenVersion: 1 }, $unset: { refreshTokenHash: 1 } },
  );
};

const getProfile = async (userId) =>
  User.findById(userId)
    .select("name email phone role userStatus createdAt updatedAt")
    .lean();

export default { register, login, refresh, logout, getProfile };
