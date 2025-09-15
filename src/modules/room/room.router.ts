import { Router } from "express";
import multer from "multer";
import { RoomController } from "./room.controller";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { env } from "../../config";

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

    // ================= GET ROOMS (GENERAL) =================
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      this.roomController.getRooms
    );

    // ================= GET ROOMS (TENANT) =================
    this.router.get(
      "/tenant",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomController.getRoomsTenant
    );

    // ================= CREATE ROOM =================
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      upload.single("image"),
      this.roomController.createRoom
    );

    // ================= GET ROOM BY ID =================
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomController.getRoom
    );

    // ================= DELETE ROOM =================
    this.router.delete(
      "/room/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomController.deleteRoom
    );

    // ================= UPDATE ROOM =================
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
