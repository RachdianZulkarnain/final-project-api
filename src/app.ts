import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import "reflect-metadata";
import { PORT } from "./config/env";
import "reflect-metadata";
import { PORT } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";

import { AuthRouter } from "./modules/auth/auth.router";
import { AccountRouter } from "./modules/account/account.router";
import { UserRouter } from "./modules/profile/profile.router";
import { PropertyRouter } from "./modules/property/property.router";
import { CategoryRouter } from "./modules/category/category.router";
import { RoomRouter } from "./modules/room/room.router";
import { PeakSeasonRouter } from "./modules/peak-season-rate/peakSeasonRate.router";
import { RoomNonAvailabilityRouter } from "./modules/room-non-availability/roomNonAvailability.router";
import { PaymentRouter } from "./modules/payment/payment.router";
import { CalendarRouter } from "./modules/calender/calender.router";
import { CalendarRouter } from "./modules/calender/calender.router";

export class App {
  private app: Express;
export class App {
  private app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
  }

  private configure() {
  private configure() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private routes() {
    const authRouter = new AuthRouter();
    const accountRouter = new AccountRouter();
    const userRouter = new UserRouter();
    const propertyRouter = new PropertyRouter();
    const categoryRouter = new CategoryRouter();
    const roomRouter = new RoomRouter();
    const peakSeasonRouter = new PeakSeasonRouter();
    const roomNonAvailabilityRouter = new RoomNonAvailabilityRouter();
    const paymentRouter = new PaymentRouter();
    const calendarRouter = new CalendarRouter();

    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/account", accountRouter.getRouter());
    this.app.use("/user", userRouter.getRouter());
    this.app.use("/properties", propertyRouter.getRouter());
    this.app.use("/categories", categoryRouter.getRouter());
    this.app.use("/rooms", roomRouter.getRouter());
    this.app.use("/peak-season", peakSeasonRouter.getRouter());
    this.app.use(
      "/room-non-availabilities",
      roomNonAvailabilityRouter.getRouter()
    );
    this.app.use("/payments", paymentRouter.getRouter());
    this.app.use("/calendar", calendarRouter.getRouter());
    this.app.use("/calendar", calendarRouter.getRouter());
  }

  private handleError() {
    this.app.use(errorMiddleware);
    this.app.use(errorMiddleware);
  }

  public start() {
    this.app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  }
}
