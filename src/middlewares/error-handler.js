import { formatApiError } from "../utils/api-error.js";

export default function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let statusCode = error.statusCode;
  let message = error.message;
  let details = error.details;

  if (error.code === 11000) {
    statusCode = 409;
    if (error.keyPattern?.originalLead) {
      message = "This lead has already been converted";
    } else if (error.keyPattern?.lead) {
      message = "A deal already exists for this lead";
    } else {
      message = "A record with these details already exists";
    }
  } else if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Malformed JSON request body";
  } else if (error.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.entries(error.errors || {}).map(([field]) => ({
      field,
      message: "Invalid value",
    }));
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  }

  if (![400, 401, 403, 404, 409, 413, 422, 429].includes(statusCode)) {
    statusCode = 500;
    message = "Internal server error";
    details = undefined;
    console.error("API request failed", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      codeName: error.codeName,
      statusCode,
      method: req.method,
    });
  }

  return res.status(statusCode).send(formatApiError(statusCode, message, details));
}
