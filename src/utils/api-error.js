export const createApiError = (statusCode, message, details) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
};

export const getErrorCode = (statusCode) => {
  const codes = {
    400: "INVALID_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    422: "VALIDATION_ERROR",
    429: "TOO_MANY_REQUESTS",
  };
  return codes[statusCode] || "INTERNAL_SERVER_ERROR";
};

export const formatApiError = (statusCode, message, details) => ({
  error: {
    code: getErrorCode(statusCode),
    message,
    details: Array.isArray(details) ? details : [],
  },
});
