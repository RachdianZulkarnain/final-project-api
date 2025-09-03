import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { container } from "tsyringe";
import { AuthRouter } from "./modules/auth/auth.router";
import { errorMiddleware } from "./middlewares/error.middleware";
import { PORT } from "./config/env";
import { UserRouter } from "./modules/profile/profile.router";
import { PropertyRouter } from "./modules/property/property.router";
import { CategoryRouter } from "./modules/category/category.router";
import { RoomRouter } from "./modules/room/room.router";
import { PeakSeasonRouter } from "./modules/peak-season-rate/peakSeasonRate.router";

export default class App {
  public app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
  }

  private configure(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private routes(): void {
    const authRouter = container.resolve(AuthRouter);
    const userRouter = container.resolve(UserRouter);
    const propertyRouter = container.resolve(PropertyRouter);
    const categoryRouter = container.resolve(CategoryRouter);
    const roomRouter = container.resolve(RoomRouter);
     const peakSeasonRouter = container.resolve(PeakSeasonRouter);

    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/user", userRouter.getRouter());
    this.app.use("/properties", propertyRouter.getRouter());
    this.app.use("/categories", categoryRouter.getRouter());
    this.app.use("/room", roomRouter.getRouter());
    this.app.use("/peak-season", peakSeasonRouter.getRouter());

  }

  private handleError() {
    this.app.use(errorMiddleware); // Global error handler
  }

  public start() {
    if (!PORT) {
      console.error("❌ PORT is not defined in environment variables.");
      process.exit(1);
    }

    this.app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  }
}
