// account.router.ts
import { Router } from "express";
import { uploader } from "../../lib/multer";
import { fileFilterProfile } from "../../lib/profilePictureFilter";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { AccountController } from "./account.controller";

export class AccountRouter {
  private router: Router;
  private accountController: AccountController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.accountController = new AccountController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.get(
      "/profile",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.accountController.getProfile
    );

    this.router.get(
      "/tenant",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.accountController.getTenant
    );

    this.router.patch(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      uploader(1).single("imageFile"),
      fileFilterProfile,
      this.accountController.updateProfile
    );

    this.router.patch(
      "/change-password",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.accountController.changePassword
    );

    this.router.post(
      "/verify-change-email",
      this.accountController.verifyChangeEmail
    );

    this.router.post(
      "/change-email",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.accountController.changeEmail
    );

    this.router.patch(
      "/tenant",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      uploader(1).single("imageFile"),
      fileFilterProfile,
      this.accountController.updateTenantProfile
    );
  };

  getRouter = () => {
    return this.router;
  };
}
