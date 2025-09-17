import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UpdateUserDTO } from "./dto/updateUser.dto";
import { UserService } from "./profile.service";

export class UserController {
  private userService: UserService;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.userService = new UserService();
    this.cloudinaryService = new CloudinaryService();
  }

  /** GET USER */
  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUserId = Number(req.params.id);
      const result = await this.userService.getUser(authUserId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /** UPDATE USER */
  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ApiError("Unauthorized", 401);
      const body = req.body as UpdateUserDTO;

      const result = await this.userService.updateUser(req.user.id, body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /** UPLOAD PROFILE PICTURE */
  uploadProfilePic = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) throw new ApiError("Unauthorized", 401);

      const file = req.file;
      if (!file) throw new ApiError("No file uploaded", 400);

      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/jpg",
      ];
      const maxSize = 1 * 1024 * 1024; // 1MB

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new ApiError(
          "Invalid file type. Only JPG, PNG, GIF allowed",
          400
        );
      }
      if (file.size > maxSize) {
        throw new ApiError("File too large (max 1MB)", 400);
      }

      const uploadResult = await this.cloudinaryService.upload(file);
      const result = await this.userService.uploadProfilePic(
        req.user.id,
        uploadResult.secure_url
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
