import express from "express";
import userController from "../controllers/user.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate from "../middlewares/validate.js";
import {
  createUserSchema,
  statusSchema,
  updateUserSchema,
  userIdSchema,
  userListSchema,
} from "../utils/validation.js";

const router = express.Router();
router.use(authenticate, authorize("ADMIN"));

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a CRM user
 *     description: Administrator-only. Use this endpoint to create users with any supported role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateUserRequest"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserMutationResponse"
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ValidationErrorResponse"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       403:
 *         description: Administrator role required
 *       409:
 *         description: Email is already registered
 */
/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     description: Administrator-only user listing with pagination, search, filters, and sorting.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         description: Case-insensitive search across name and email
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, SALES_MANAGER, SALES_EXECUTIVE]
 *       - in: query
 *         name: userStatus
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, role, userStatus, createdAt, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Paginated users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserListResponse"
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ValidationErrorResponse"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 */
router
  .route("/")
  .post(validate(createUserSchema), userController.createUser)
  .get(validate(userListSchema, "query"), userController.listUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 665f1a12b2f0410012345678
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ProfileResponse"
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: User not found
 *   patch:
 *     tags: [Users]
 *     summary: Update a user
 *     description: Changing a user's password, role, or active status revokes existing sessions. Administrators cannot change their own role or deactivate themselves.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 665f1a12b2f0410012345678
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateUserRequest"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserMutationResponse"
 *       400:
 *         description: Invalid request or prohibited self-change
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: User not found
 *       409:
 *         description: Email is already registered
 *   delete:
 *     tags: [Users]
 *     summary: Delete an inactive user
 *     description: Only inactive users can be deleted. Administrators cannot delete their own account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 665f1a12b2f0410012345678
 *     responses:
 *       204:
 *         description: User deleted
 *       400:
 *         description: Invalid user ID or self-deletion attempt
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: User not found
 *       409:
 *         description: User must be inactive and cannot be referenced by leads, activities, history, or team members
 */
router
  .route("/:id")
  .get(validate(userIdSchema, "params"), userController.getUser)
  .patch(
    validate(userIdSchema, "params"),
    validate(updateUserSchema),
    userController.updateUser,
  )
  .delete(validate(userIdSchema, "params"), userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 665f1a12b2f0410012345678
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateUserStatusRequest"
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserMutationResponse"
 *       400:
 *         description: Invalid status, user ID, or prohibited self-deactivation
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrator role required
 *       404:
 *         description: User not found
 */
router.patch(
  "/:id/status",
  validate(userIdSchema, "params"),
  validate(statusSchema),
  userController.setUserStatus,
);

export default router;
