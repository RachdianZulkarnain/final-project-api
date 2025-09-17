import { Router } from "express";
import { env } from "../../config";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { fileFilter, uploader } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { UpdateUserDTO } from "./dto/updateUser.dto";
import { UserController } from "./profile.controller";

export class UserRouter {
  private router: Router;
  private userController: UserController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.userController = new UserController();
    this.jwtMiddleware = new JwtMiddleware();
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

  getRouter = (): Router => {
    return this.router;
  };
}
