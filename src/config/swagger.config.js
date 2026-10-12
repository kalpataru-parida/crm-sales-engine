import "dotenv/config";
import swaggerJsdoc from "swagger-jsdoc";
import { schemas } from "./swagger.schemas.js";

const swaggerHost =
  process.env.SWAGGER_HOST || `http://localhost:${process.env.PORT || 5000}`;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CRM Sales Engine API",
      description: "API documentation for the CRM Sales Engine.",
      version: "1.0.0",
    },
    servers: [
      {
        url: swaggerHost,
        description: "CRM Sales Engine API server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Bearer token authentication",
        },
      },
      schemas,
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.routes.js"],
};

export const specs = swaggerJsdoc(options);
