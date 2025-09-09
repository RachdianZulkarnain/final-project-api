import { Router } from "express";
import { autoInjectable } from "tsyringe";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { env } from "../../config";
import { CalendarController } from "./calender.controller";

@autoInjectable()
export class CalendarRouter {
  private readonly router: Router = Router();

  constructor(
    private readonly roomPricingController?: CalendarController,
    private readonly jwtMiddleware?: JwtMiddleware
  ) {
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    // ================= GET MONTHLY CALENDAR =================
    this.router.get(
      "/room/:roomId",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomPricingController!.getMonthlyCalendar
    );

    // ================= COMPARE ROOM PRICING =================
    this.router.post(
      "/compare",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomPricingController!.compareRoomPricing
    );

    // ================= GET PROPERTY MONTHLY PRICE COMPARISON =================
    this.router.get(
      "/property/:propertyId",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.roomPricingController!.getPropertyMonthlyPriceComparison
    );
  };

  getRouter(): Router {
    return this.router;
  }
}
