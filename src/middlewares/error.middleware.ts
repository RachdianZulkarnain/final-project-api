import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("🔥 Global Error Middleware:", err);

  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return res.status(409).json({
          message: "Unique constraint violation. A duplicate value exists.",
          field: err.meta?.target,
        });

      case "P2003":
        return res.status(400).json({
          message: "Foreign key constraint violation.",
          field: err.meta?.field_name,
        });

      case "P2025":
        return res.status(404).json({
          message: "Record not found.",
          model: err.meta?.modelName,
        });

      default:
        return res.status(500).json({
          message: "An unexpected Prisma error occurred.",
          code: err.code,
        });
    }
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      message: err.message,
      errors: (err as any).errors || null,
    });
  }

  // fallback untuk error biasa
  return res.status(500).json({
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}
