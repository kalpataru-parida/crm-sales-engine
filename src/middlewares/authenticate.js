import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { createApiError } from "../utils/api-error.js";
import { getBearerToken, verifyAccessToken } from "../utils/jwt.js";

export default async function authenticate(req, res, next) {
  const token = getBearerToken(req.get("authorization"));
  if (!token) {
    return next(createApiError(401, "Authentication required"));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("+tokenVersion");
    if (
      !user ||
      user.userStatus !== "ACTIVE" ||
      user.tokenVersion !== payload.version
    ) {
      return next(createApiError(401, "Invalid or expired session"));
    }
    req.user = {
      id: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(createApiError(401, "Invalid or expired token"));
    }
    return next(error);
  }
}
