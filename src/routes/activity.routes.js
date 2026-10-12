import express from "express";
import activityController from "../controllers/activity.controller.js";
import authenticate from "../middlewares/authenticate.js";
import validate from "../middlewares/validate.js";
import {
  activityIdSchema,
  activityListSchema,
  createActivitySchema,
  updateActivitySchema,
} from "../utils/validation.js";

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/activities:
 *   post:
 *     tags: [Activities]
 *     summary: Create an activity
 *     description: Activities are assigned to the current user by default. Administrators can assign any active user; managers can assign themselves or their direct reports; executives can assign themselves. Overdue is calculated from dueDate and Pending status.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateActivityRequest"
 *     responses:
 *       201: { description: Activity created }
 *       400: { description: Invalid activity details or inactive assigned user }
 *       403: { description: Assigned user or related entity is not accessible }
 *       404: { description: Related entity not found }
 *   get:
 *     tags: [Activities]
 *     summary: List accessible activities
 *     description: Administrators see all activities, managers see their own and direct reports' activities, and executives see activities assigned to themselves.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         description: Case-insensitive search across title and description
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [Call, Email, Meeting, Demo, Follow-up, Reminder, Note] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Pending, Completed, Overdue] }
 *       - in: query
 *         name: assignedUser
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *       - in: query
 *         name: relatedEntityType
 *         schema: { type: string, enum: [Lead, Customer, Deal, User] }
 *       - in: query
 *         name: relatedEntityId
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [title, type, dueDate, status, createdAt, updatedAt], default: dueDate }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200: { description: Paginated activity list }
 */
router
  .route("/")
  .post(validate(createActivitySchema), activityController.createActivity)
  .get(
    validate(activityListSchema, "query"),
    activityController.listActivities,
  );

/**
 * @swagger
 * /api/activities/{id}:
 *   get:
 *     tags: [Activities]
 *     summary: Get an activity by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       200: { description: Activity details }
 *       403: { description: Activity is not accessible to this user }
 *       404: { description: Activity not found }
 *   patch:
 *     tags: [Activities]
 *     summary: Update an activity
 *     description: Status is managed by the server; use the completion endpoint to complete an activity. Set relatedEntity to null to unlink it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateActivityRequest"
 *     responses:
 *       200: { description: Activity updated }
 *       400: { description: Invalid activity details }
 *       403: { description: Activity is not accessible to this user }
 *       404: { description: Activity not found }
 *   delete:
 *     tags: [Activities]
 *     summary: Delete an activity
 *     description: The activity must be accessible to the caller; only its creator or an administrator can delete it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       204: { description: Activity deleted }
 *       403: { description: Activity cannot be deleted by this user }
 *       404: { description: Activity not found }
 */
router
  .route("/:id")
  .get(validate(activityIdSchema, "params"), activityController.getActivity)
  .patch(
    validate(activityIdSchema, "params"),
    validate(updateActivitySchema),
    activityController.updateActivity,
  )
  .delete(validate(activityIdSchema, "params"), activityController.deleteActivity);

/**
 * @swagger
 * /api/activities/{id}/complete:
 *   patch:
 *     tags: [Activities]
 *     summary: Mark an activity as completed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       200: { description: Activity marked completed with completedAt set by the server }
 *       403: { description: Activity is not accessible to this user }
 *       404: { description: Activity not found }
 */
router.patch(
  "/:id/complete",
  validate(activityIdSchema, "params"),
  activityController.completeActivity,
);

export default router;
