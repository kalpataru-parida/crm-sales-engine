import { createApiError } from "../utils/api-error.js";

export default function validate(schema, target = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      convert: true,
      stripUnknown: true,
    });

    if (error) {
      return next(
        createApiError(
          400,
          "Invalid request",
          error.details.map(({ message, path }) => ({
            field: path.join("."),
            message,
          })),
        ),
      );
    }

    if (target === "query") {
      req.validatedQuery = value;
    } else {
      req[target] = value;
    }
    return next();
  };
}
