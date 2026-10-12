import express from "express";
import cors from "cors";
import helmet from "helmet";
import apiRoutes from "./src/routes/api.routes.js";
import swaggerUi from "swagger-ui-express";
import { specs } from "./src/config/swagger.config.js";
import errorHandler from "./src/middlewares/error-handler.js";
import { createApiError } from "./src/utils/api-error.js";

const app = express();
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(helmet());
app.use(cors({ origin: corsOrigins.length ? corsOrigins : false }));
app.use(express.json({ limit: "10kb" }));
app.use(
  express.urlencoded({ extended: false, limit: "10kb", parameterLimit: 20 }),
);

app.get("/", async (req, res) => {
  res.send({ message: "Awesome it works" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use("/api", apiRoutes);

app.use((req, res, next) => {
  next(createApiError(404, "Route not found"));
});
app.use(errorHandler);

export default app;
