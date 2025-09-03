import { Router } from "express";
import { autoInjectable } from "tsyringe";
import { RoomController } from "./room.controller";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { env } from "../../config";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

@autoInjectable()
export class RoomRouter {
  private readonly router: Router = Router();

  constructor(
    private readonly roomController?: RoomController,
    private readonly jwtMiddleware?: JwtMiddleware
  ) {
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    // CREATE ROOM (with image upload)
    this.router.post(
      "/room",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      upload.single("image"),
      this.roomController!.createRoom
    );
  };

  getRouter(): Router {
    return this.router;
  }
}
