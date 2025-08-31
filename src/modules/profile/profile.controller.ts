import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { UpdateUserDTO } from "./dto/updateUser.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UserService } from "./profile.service";

@injectable()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUserId = Number(req.params.id);
      const result = await this.userService.getUser(authUserId);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUserId = req.user!.id;
      const body = req.body as UpdateUserDTO;
      const result = await this.userService.updateUser(authUserId, body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  uploadProfilePic = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authUserId = (req as any).user!.id;
      const file = req.file;
      if (!file) throw new ApiError("No file uploaded", 400);

      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/jpg",
      ];
      const maxSize = 1 * 1024 * 1024; // 1MB

      if (!allowedMimeTypes.includes(file.mimetype))
        throw new ApiError(
          "Invalid file type. Only JPG, PNG, GIF allowed",
          400
        );
      if (file.size > maxSize)
        throw new ApiError("File too large (max 1MB)", 400);

      const uploadResult = await this.cloudinaryService.upload(file);
      const uploadPath = uploadResult.secure_url;

      const result = await this.userService.uploadProfilePic(
        authUserId,
        uploadPath
      );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
