import prisma from "../config/prisma.js";

export function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, req, res, next) {
  const status = error.statusCode || 500;
  if (status >= 500) {
    console.error(error);
    prisma.systemAlert.create({
      data: {
        type: "SERVER_ERROR",
        severity: "ERROR",
        title: `Server error on ${req.method} ${req.originalUrl}`,
        message: String(error.message || "Internal server error").slice(0, 500),
      },
    }).catch(() => {});
  }
  res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
    errors: error.errors || null,
  });
}
