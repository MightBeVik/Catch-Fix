export function createHttpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

export function sendError(response, error) {
  const status = error.status || 500;
  response.status(status).json({
    error: error.message || "Unexpected server error",
    details: error.details || null,
  });
}