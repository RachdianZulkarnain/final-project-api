import { Request, Response, NextFunction } from "express";

export const isTenant = (req: any, res: Response, next: NextFunction) => {
  const user = req.user; // <- ambil dari req.user, bukan res.locals

  if (user && user.role === "TENANT") {
    return next();
  }

  res.status(403).json({
    status: "error",
    message: "Access denied. Only Tenant can do this action.",
  });
};
