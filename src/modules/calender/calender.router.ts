import { Router } from "express";
import { env } from "../../config";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { CalendarController } from "./calender.controller";

export class CalendarRouter {
  private readonly router: Router;
  private readonly calendarController: CalendarController;
  private readonly jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.calendarController = new CalendarController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    this.router.get(
      "/room/:roomId",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      this.calendarController.getMonthlyCalendar
    );

    this.router.post(
      "/compare",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      this.calendarController.compareRoomPricing
    );

    this.router.get(
      "/property/:propertyId",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      this.calendarController.getPropertyMonthlyPriceComparison
    );
  };

  getRouter(): Router {
    return this.router;
  }
}
