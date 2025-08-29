import { Router } from "express";
import { autoInjectable } from "tsyringe";
import { env } from "../../config";
import { UpdateUserDTO } from "./dto/updateUser.dto";
import { fileFilter, uploader } from "../../middlewares/uploader.middleware";
import { UserController } from "./profile.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateBody } from "../../middlewares/validate.middleware";

@autoInjectable()
export class UserRouter {
  private readonly router: Router = Router();

  constructor(
    private readonly userController: UserController,
    private readonly jwtMiddleware: JwtMiddleware
  ) {
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    this.router.get("/:id", this.userController.getUser);
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      validateBody(UpdateUserDTO),
      this.userController.updateUser
    );
    this.router.patch(
      "/photo/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      uploader().single("profilePic"),
      fileFilter,
      this.userController.uploadProfilePic
    );
  };

  getRouter(): Router {
    return this.router;
  }
}
