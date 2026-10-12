import express from "express";
import rateLimit from "express-rate-limit";
import authController from "../controllers/auth.controller.js";
import authenticate from "../middlewares/authenticate.js";
import validate from "../middlewares/validate.js";
import { createApiError } from "../utils/api-error.js";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from "../utils/validation.js";

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, next, options) =>
    next(
      createApiError(
        options.statusCode,
        "Too many requests, please try again later.",
      ),
    ),
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     security: []
 *     summary: Register a sales executive
 *     description: Public registration always creates an active SALES_EXECUTIVE. Role and status cannot be chosen by the caller.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegisterRequest"
 *     responses:
 *       201:
 *         description: Account registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RegisterResponse"
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: Email is already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         description: Too many requests
 */
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register,
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     security: []
 *     summary: Log in
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/LoginRequest"
 *     responses:
 *       200:
 *         description: Authenticated; includes short-lived access and refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TokenResponse"
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ValidationErrorResponse"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         description: Too many requests
 */
router.post("/login", authLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     security: []
 *     summary: Rotate a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RefreshRequest"
 *     responses:
 *       200:
 *         description: Rotated access and refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TokenPair"
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ValidationErrorResponse"
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       429:
 *         description: Too many requests
 */
router.post(
  "/refresh",
  authLimiter,
  validate(refreshSchema),
  authController.refresh,
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Log out and revoke the current account's tokens
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Logged out
 *       401:
 *         description: Missing or invalid access token
 */
router.post("/logout", authenticate, authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get the current user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProfileResponse"
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.get("/me", authenticate, authController.me);

export default router;
