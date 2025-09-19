import { Router } from "express";
import multer from "multer";
import { env } from "../../config";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoomController } from "./room.controller";

export class RoomRouter {
  private router: Router;
  private roomController: RoomController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.roomController = new RoomController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    const upload = multer({ storage: multer.memoryStorage() });

    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      this.roomController.getRooms
    );

    this.router.get(
      "/tenant",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomController.getRoomsTenant
    );

    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      upload.single("image"),
      this.roomController.createRoom
    );

    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomController.getRoom
    );

    this.router.delete(
      "/room/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomController.deleteRoom
    );

    this.router.patch(
      "/room/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      upload.single("image"),
      this.roomController.updateRoom
    );
  };

  getRouter = (): Router => {
    return this.router;
  };
}
