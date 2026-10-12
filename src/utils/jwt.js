import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const getSecrets = () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!accessSecret || accessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must contain at least 32 characters");
  }
  if (!refreshSecret || refreshSecret.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must contain at least 32 characters");
  }
  if (accessSecret === refreshSecret) {
    throw new Error("JWT access and refresh secrets must be different");
  }
  return { accessSecret, refreshSecret };
};

export const signAccessToken = (user) => {
  const { accessSecret } = getSecrets();
  return jwt.sign(
    { type: "access", role: user.role, version: user.tokenVersion },
    accessSecret,
    {
      subject: user.id,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
      algorithm: "HS256",
    },
  );
};

export const signRefreshToken = (user) => {
  const { refreshSecret } = getSecrets();
  return jwt.sign(
    { type: "refresh", version: user.tokenVersion },
    refreshSecret,
    {
      subject: user.id,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
      algorithm: "HS256",
    },
  );
};

export const verifyAccessToken = (token) => {
  const { accessSecret } = getSecrets();
  const payload = jwt.verify(token, accessSecret, { algorithms: ["HS256"] });
  if (payload.type !== "access" || typeof payload.sub !== "string") {
    throw new jwt.JsonWebTokenError("Invalid access token");
  }
  return payload;
};

export const verifyRefreshToken = (token) => {
  const { refreshSecret } = getSecrets();
  const payload = jwt.verify(token, refreshSecret, { algorithms: ["HS256"] });
  if (payload.type !== "refresh" || typeof payload.sub !== "string") {
    throw new jwt.JsonWebTokenError("Invalid refresh token");
  }
  return payload;
};

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getBearerToken = (authorization) => {
  if (typeof authorization !== "string") return null;
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || null;
};
