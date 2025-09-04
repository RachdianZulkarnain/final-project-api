// room-non-availability.router.ts
import { Router } from "express";
import { autoInjectable } from "tsyringe";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { env } from "../../config";
import { RoomNonAvailabilityController } from "./roomNonAvailability.controller";

@autoInjectable()
export class RoomNonAvailabilityRouter {
  private readonly router: Router = Router();

  constructor(
    private readonly roomNonAvailabilityController?: RoomNonAvailabilityController,
    private readonly jwtMiddleware?: JwtMiddleware
  ) {
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    // ================= GET ROOM NON AVAILABILITIES =================
    this.router.get(
      "/",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomNonAvailabilityController!.getRoomNonAvailabilities
    );

    // ================= CREATE ROOM NON AVAILABILITY =================
    this.router.post(
      "/room",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomNonAvailabilityController!.createRoomNonAvailability
    );

    // ================= UPDATE ROOM NON AVAILABILITY =================
    this.router.patch(
      "/room/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomNonAvailabilityController!.updateRoomNonAvailability
    );

    // ================= DELETE ROOM NON AVAILABILITY =================
    this.router.delete(
      "/room/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomNonAvailabilityController!.deleteRoomNonAvailability
    );
  };

  getRouter(): Router {
    return this.router;
  }
}
