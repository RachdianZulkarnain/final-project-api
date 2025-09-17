import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

export function errorMiddleware(
  err: ApiError | PrismaClientKnownRequestError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
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

  const status = (err as ApiError).status || 500;
  const message = (err as ApiError).message || "Something went wrong";
  return res.status(status).json({ message });
}
