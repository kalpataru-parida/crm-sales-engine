import { createApiError } from "../utils/api-error.js";

export default function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(createApiError(403, "You are not authorized"));
    }
    return next();
  };
}
