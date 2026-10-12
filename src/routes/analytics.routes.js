import express from "express";
import analyticsController from "../controllers/analytics.controller.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get sales dashboard statistics
 *     description: Returns current all-time totals. Administrators see all records, managers see their direct reports' sales records, and executives see their own records. Revenue totals are raw sums; currency breakdowns preserve amounts by currency without conversion. Pending activities are non-completed and due now or later; overdue activities are non-completed and past due.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Dashboard metrics }
 *       401: { description: Authentication required }
 *       403: { description: Access denied }
 */
router.get("/dashboard", analyticsController.getDashboard);

/**
 * @swagger
 * /api/analytics/pipeline:
 *   get:
 *     tags: [Analytics]
 *     summary: Get deal counts and values by sales stage
 *     description: Returns every deal stage, including stages with no deals. Value totals are raw sums; the currency breakdowns are not converted.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Deal count and value grouped by stage }
 *       401: { description: Authentication required }
 *       403: { description: Access denied }
 */
router.get("/pipeline", analyticsController.getPipeline);

/**
 * @swagger
 * /api/analytics/team:
 *   get:
 *     tags: [Analytics]
 *     summary: Get sales performance by executive
 *     description: Sales managers see their direct reports; administrators see all sales executives. Each executive's metrics use the same definitions as the dashboard.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Team-level sales metrics }
 *       401: { description: Authentication required }
 *       403: { description: Only managers and administrators may access team performance }
 */
router.get(
  "/team",
  authorize("SALES_MANAGER", "ADMIN"),
  analyticsController.getTeamPerformance,
);

export default router;
