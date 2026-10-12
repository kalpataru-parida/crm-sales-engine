import express from "express";
import leadController from "../controllers/lead.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate from "../middlewares/validate.js";
import {
  assignLeadSchema,
  createLeadSchema,
  convertLeadSchema,
  leadIdSchema,
  leadListSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
} from "../utils/validation.js";

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/leads:
 *   post:
 *     tags: [Leads]
 *     summary: Create a lead
 *     description: Sales executives are assigned to themselves by default. Administrators and sales managers must provide an active sales executive ID.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateLeadRequest"
 *     responses:
 *       201:
 *         description: Lead created
 *       400:
 *         description: Invalid lead data or sales executive
 */
/**
 * @swagger
 * /api/leads:
 *   get:
 *     tags: [Leads]
 *     summary: Search and list leads
 *     description: Supports combined filters. Sales executives see their assigned leads; sales managers see leads assigned to their direct reports; administrators see all leads.
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
 *         description: Case-insensitive search across lead name, email, phone, company, and description
 *         schema: { type: string }
 *       - in: query
 *         name: source
 *         schema: { type: string, enum: [Website, Referral, Social Media, Email, Phone, Other] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [New, Contacted, Qualified, Unqualified, Converted, Lost] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [Low, Medium, High] }
 *       - in: query
 *         name: assignedExecutive
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *       - in: query
 *         name: dateFrom
 *         description: Inclusive createdAt lower bound (ISO 8601)
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: dateTo
 *         description: Inclusive createdAt upper bound (ISO 8601)
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [name, company, source, status, priority, createdAt, updatedAt], default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated lead results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LeadListResponse"
 */
router
  .route("/")
  .post(validate(createLeadSchema), leadController.createLead)
  .get(validate(leadListSchema, "query"), leadController.listLeads);

/**
 * @swagger
 * /api/leads/{id}/timeline:
 *   get:
 *     tags: [Leads]
 *     summary: Get the chronological audit timeline for an accessible lead
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       200:
 *         description: Chronological lead timeline
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TimelineResponse"
 *       403: { description: Lead is not accessible to this user }
 *       404: { description: Lead not found }
 */
router.get(
  "/:id/timeline",
  validate(leadIdSchema, "params"),
  leadController.getLeadTimeline,
);

/**
 * @swagger
 * /api/leads/{id}:
 *   get:
 *     tags: [Leads]
 *     summary: Get a lead
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       200: { description: Lead details }
 *       403: { description: Lead is not assigned to this sales executive }
 *       404: { description: Lead not found }
 *   patch:
 *     tags: [Leads]
 *     summary: Update lead details
 *     description: Status and assignment have dedicated endpoints. Sales executives may only update leads assigned to them.
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
 *             $ref: "#/components/schemas/UpdateLeadRequest"
 *     responses:
 *       200: { description: Lead updated }
 *       400: { description: Invalid lead data }
 *       403: { description: Lead is not assigned to this sales executive }
 *       404: { description: Lead not found }
 *   delete:
 *     tags: [Leads]
 *     summary: Delete a lead
 *     description: Administrators can delete any non-converted lead; sales managers can delete only non-converted leads assigned within their team.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       204: { description: Lead deleted }
 *       403: { description: Administrator or sales manager role required }
 *       409: { description: Converted leads cannot be deleted }
 */
router
  .route("/:id")
  .get(validate(leadIdSchema, "params"), leadController.getLead)
  .patch(
    validate(leadIdSchema, "params"),
    validate(updateLeadSchema),
    leadController.updateLead,
  )
  .delete(
    authorize("ADMIN", "SALES_MANAGER"),
    validate(leadIdSchema, "params"),
    leadController.deleteLead,
  );

/**
 * @swagger
 * /api/leads/{id}/status:
 *   patch:
 *     tags: [Leads]
 *     summary: Update lead status
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
 *             $ref: "#/components/schemas/UpdateLeadStatusRequest"
 *     responses:
 *       200: { description: Lead status updated }
 *       400: { description: Invalid status }
 *       403: { description: Lead is not assigned to this sales executive }
 *       404: { description: Lead not found }
 */
router.patch(
  "/:id/status",
  validate(leadIdSchema, "params"),
  validate(updateLeadStatusSchema),
  leadController.updateLeadStatus,
);

/**
 * @swagger
 * /api/leads/{id}/convert:
 *   post:
 *     tags: [Leads]
 *     summary: Convert a qualified lead to a customer and deal
 *     description: The lead, customer, deal, and conversion timeline records are written in one MongoDB transaction. Only a qualified lead may be converted, and it cannot be converted again. The deal title and amount are required.
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
 *             $ref: "#/components/schemas/ConvertLeadRequest"
 *     responses:
 *       201:
 *         description: Customer and deal created and lead converted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LeadConversionResponse"
 *       400: { description: Invalid deal details }
 *       403: { description: Lead is not accessible to this user }
 *       404: { description: Lead not found }
 *       409: { description: Lead is not eligible or is already converted }
 */
router.post(
  "/:id/convert",
  validate(leadIdSchema, "params"),
  validate(convertLeadSchema),
  leadController.convertLead,
);

/**
 * @swagger
 * /api/leads/{id}/assignment:
 *   patch:
 *     tags: [Leads]
 *     summary: Assign or reassign a lead
 *     description: Administrators can assign to any active sales executive. Sales managers can only reassign leads currently owned by their team to an active executive reporting to them. Assignment events appear in the lead's activityTimeline.
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
 *             $ref: "#/components/schemas/AssignLeadRequest"
 *     responses:
 *       200: { description: Lead assigned }
 *       400: { description: Assignee must be an active sales executive }
 *       403: { description: Administrator or sales manager role required }
 *       404: { description: Lead not found }
 */
router.patch(
  "/:id/assignment",
  authorize("ADMIN", "SALES_MANAGER"),
  validate(leadIdSchema, "params"),
  validate(assignLeadSchema),
  leadController.assignLead,
);

export default router;
