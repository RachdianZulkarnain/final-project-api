import { Router } from "express";
import { env } from "../../config";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoomNonAvailabilityController } from "./roomNonAvailability.controller";

export class RoomNonAvailabilityRouter {
  private router: Router;
  private roomNonAvailabilityController: RoomNonAvailabilityController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.roomNonAvailabilityController = new RoomNonAvailabilityController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.roomNonAvailabilityController.getRoomNonAvailabilities
    );

    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.roomNonAvailabilityController.createRoomNonAvailability
    );

    this.router.patch(
      "/room/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.roomNonAvailabilityController.updateRoomNonAvailability
    );

    this.router.delete(
      "/room/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.roomNonAvailabilityController.deleteRoomNonAvailability
    );
  };

  getRouter = (): Router => {
    return this.router;
  };
}
