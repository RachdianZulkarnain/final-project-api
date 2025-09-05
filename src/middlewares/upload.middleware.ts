import multer from "multer";
import core, { fromBuffer } from "file-type/core";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

export class UploaderMiddleware {
  upload = () => {
    const storage = multer.memoryStorage();

    const limits = { fileSize: 5 * 1024 * 1024 }; // 5mb

    return multer({ storage, limits });
  };

  fileFilter = (allowedTypes: core.MimeType[]) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || Object.values(files).length === 0) {
        return next();
      }

      for (const fieldname in files) {
        const fileArray = files[fieldname];

        for (const file of fileArray) {
          const type = await fromBuffer(file.buffer);

          if (!type || !allowedTypes.includes(type.mime)) {
            throw new ApiError(`File type ${type?.mime} is not allowed`, 400);
          }
        }
      }

      next();
    };
  };
}