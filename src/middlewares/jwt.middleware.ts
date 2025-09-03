import { NextFunction, Request, Response } from "express";
import { TokenExpiredError, verify, JwtPayload } from "jsonwebtoken";
import { ApiError } from "../utils/api-error";

interface CustomJwtPayload extends JwtPayload {
  id: number;
  role?: string;
}

export class JwtMiddleware {
  verifyToken = (secretKey: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      let token: string | undefined;

      if (req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
      } else if (req.query.token) {
        token = req.query.token as string;
      } else if (req.body.token) {
        token = req.body.token;
      }

      if (!token) return next(new ApiError("No token provided", 401));

      verify(token, secretKey, (err, decoded) => {
        if (err) {
          if (err instanceof TokenExpiredError)
            return next(new ApiError("Token expired", 401));
          return next(new ApiError("Invalid token", 401));
        }

        const payload = decoded as CustomJwtPayload;

        if (!payload || typeof payload.id !== "number")
          return next(new ApiError("Invalid token payload", 401));

        // assign ke req.user dan res.locals.user supaya controller bisa akses
        (req as any).user = payload;
        res.locals.user = payload;

        next();
      });
    };
  };
}
