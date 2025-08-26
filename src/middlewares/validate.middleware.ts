import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/api-error";

export const validateBody = (DtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dto = plainToInstance(DtoClass, req.body);

    const errors = await validate(dto);
    if (errors.length > 0) {
      const message = errors
        .map((e) => Object.values(e.constraints || {}).join(", "))
        .join("; ");

      console.log("[Validation Error]", req.body);
      throw new ApiError(message, 400);
    }

    next();
  };
};
