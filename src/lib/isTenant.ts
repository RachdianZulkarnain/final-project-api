import { NextFunction, Response } from "express";

export const isTenant = (req: any, res: Response, next: NextFunction) => {
  const user = req.user;

  if (user && user.role === "TENANT") {
    return next();
  }

  res.status(403).json({
    status: "error",
    message: "Access denied. Only Tenant can do this action.",
  });
};
