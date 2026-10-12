import express from "express";
import dealController from "../controllers/deal.controller.js";
import authenticate from "../middlewares/authenticate.js";
import validate from "../middlewares/validate.js";
import {
  createDealSchema,
  dealIdSchema,
  dealListSchema,
  updateDealSchema,
  updateDealStageSchema,
} from "../utils/validation.js";

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/deals:
 *   post:
 *     tags: [Deals]
 *     summary: Create a deal for an accessible customer and its original lead
 *     description: The assigned executive is inherited from the customer. Expected revenue is calculated by the server from amount and probability.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateDealRequest"
 *     responses:
 *       201: { description: Deal created }
 *       400: { description: Invalid deal information }
 *       403: { description: Customer is not accessible to this user }
 *       404: { description: Customer not found }
 *       409: { description: Lead and customer references are inconsistent }
 *   get:
 *     tags: [Deals]
 *     summary: Search and list accessible deals
 *     description: Sales executives see their deals; managers see deals assigned to their direct reports; administrators see all deals.
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
 *         description: Case-insensitive search across deal title, description, and lost reason
 *         schema: { type: string }
 *       - in: query
 *         name: stage
 *         schema: { type: string, enum: [Qualification, Discovery, Proposal, Negotiation, Won, Lost] }
 *       - in: query
 *         name: status
 *         description: Open includes all non-terminal stages; Won and Lost select the corresponding terminal stage
 *         schema: { type: string, enum: [Open, Won, Lost] }
 *       - in: query
 *         name: minAmount
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: maxAmount
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: customer
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *       - in: query
 *         name: lead
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
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
 *         name: expectedCloseDateFrom
 *         description: Inclusive expected closing-date lower bound (ISO 8601)
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: expectedCloseDateTo
 *         description: Inclusive expected closing-date upper bound (ISO 8601)
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [title, amount, probability, expectedCloseDate, stage, createdAt, updatedAt], default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated deals
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DealListResponse"
 */
router
  .route("/")
  .post(validate(createDealSchema), dealController.createDeal)
  .get(validate(dealListSchema, "query"), dealController.listDeals);

/**
 * @swagger
 * /api/deals/{id}:
 *   get:
 *     tags: [Deals]
 *     summary: Get an accessible deal
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       200: { description: Deal details }
 *       403: { description: Deal is not accessible to this user }
 *       404: { description: Deal not found }
 *   patch:
 *     tags: [Deals]
 *     summary: Update accessible deal details
 *     description: Stage changes must use the dedicated stage endpoint. Expected revenue is recalculated by the server.
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
 *             $ref: "#/components/schemas/UpdateDealRequest"
 *     responses:
 *       200: { description: Deal updated }
 *       400: { description: Invalid deal information }
 *       403: { description: Deal is not accessible to this user }
 *       404: { description: Deal not found }
 */
router
  .route("/:id")
  .get(validate(dealIdSchema, "params"), dealController.getDeal)
  .patch(
    validate(dealIdSchema, "params"),
    validate(updateDealSchema),
    dealController.updateDeal,
  );

/**
 * @swagger
 * /api/deals/{id}/timeline:
 *   get:
 *     tags: [Deals]
 *     summary: Get the chronological audit timeline for an accessible deal
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       200:
 *         description: Chronological deal timeline
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TimelineResponse"
 *       403: { description: Deal is not accessible to this user }
 *       404: { description: Deal not found }
 */
router.get(
  "/:id/timeline",
  validate(dealIdSchema, "params"),
  dealController.getDealTimeline,
);

/**
 * @swagger
 * /api/deals/{id}/stage:
 *   patch:
 *     tags: [Deals]
 *     summary: Change an accessible deal's stage
 *     description: Won and Lost are terminal stages. A Lost deal requires a reason. Moving a deal to Won sets probability to 100; moving it to Lost sets probability to 0.
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
 *             $ref: "#/components/schemas/UpdateDealStageRequest"
 *     responses:
 *       200: { description: Deal stage updated }
 *       400: { description: Invalid stage or missing Lost reason }
 *       403: { description: Deal is not accessible to this user }
 *       404: { description: Deal not found }
 *       409: { description: A closed deal cannot be reopened }
 */
router.patch(
  "/:id/stage",
  validate(dealIdSchema, "params"),
  validate(updateDealStageSchema),
  dealController.updateDealStage,
);

export default router;
