import express from "express";
import customerController from "../controllers/customer.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import validate from "../middlewares/validate.js";
import {
  createCustomerSchema,
  customerIdSchema,
  customerListSchema,
  updateCustomerSchema,
} from "../utils/validation.js";

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a customer from a qualified lead
 *     description: Creates a customer for an accessible qualified lead and marks that lead converted. The assigned executive is inherited from the lead.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateCustomerRequest"
 *     responses:
 *       201: { description: Customer created }
 *       400: { description: Invalid customer details }
 *       403: { description: Lead is not accessible to this user }
 *       404: { description: Original lead not found }
 *       409: { description: Lead is not eligible or is already converted }
 *   get:
 *     tags: [Customers]
 *     summary: Search and list customers
 *     description: Supports combined filters and pagination. Sales executives see their customers; managers see their direct reports' customers; administrators see all customers. Results include the original lead and associated deals.
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
 *         description: Case-insensitive search across name, email, phone, company, and address
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Active, Inactive] }
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
 *         schema: { type: string, enum: [name, company, status, createdAt, updatedAt], default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated customer results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CustomerListResponse"
 */
router
  .route("/")
  .post(validate(createCustomerSchema), customerController.createCustomer)
  .get(
    validate(customerListSchema, "query"),
    customerController.listCustomers,
  );

/**
 * @swagger
 * /api/customers/{id}/timeline:
 *   get:
 *     tags: [Customers]
 *     summary: Get the chronological audit timeline for an accessible customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       200:
 *         description: Chronological customer timeline
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TimelineResponse"
 *       403: { description: Customer is not accessible to this user }
 *       404: { description: Customer not found }
 */
router.get(
  "/:id/timeline",
  validate(customerIdSchema, "params"),
  customerController.getCustomerTimeline,
);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get a customer and its linked lead and deals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       200: { description: Customer details }
 *       400: { description: Invalid customer ID }
 *       403: { description: Customer is not accessible to this user }
 *       404: { description: Customer not found }
 *   patch:
 *     tags: [Customers]
 *     summary: Update customer details
 *     description: Updating the assigned executive also updates the linked lead and deals.
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
 *             $ref: "#/components/schemas/UpdateCustomerRequest"
 *     responses:
 *       200: { description: Customer updated }
 *       400: { description: Invalid customer details }
 *       403: { description: Customer is not accessible to this user }
 *       404: { description: Customer not found }
 *       409: { description: Customer relationship is inconsistent }
 *   delete:
 *     tags: [Customers]
 *     summary: Delete a customer without associated deals
 *     description: Administrator-only. Deletion restores the original lead to Qualified and clears its customer reference. Customers with associated deals cannot be deleted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: 665f1a12b2f0410012345678 }
 *     responses:
 *       204: { description: Customer deleted }
 *       400: { description: Invalid customer ID }
 *       403: { description: Administrator role required }
 *       404: { description: Customer not found }
 *       409: { description: Customer has associated deals or inconsistent references }
 */
router
  .route("/:id")
  .get(validate(customerIdSchema, "params"), customerController.getCustomer)
  .patch(
    validate(customerIdSchema, "params"),
    validate(updateCustomerSchema),
    customerController.updateCustomer,
  )
  .delete(
    authorize("ADMIN"),
    validate(customerIdSchema, "params"),
    customerController.deleteCustomer,
  );

export default router;
