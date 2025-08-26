import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { container } from "tsyringe";
import { AuthRouter } from "./modules/auth/auth.router";
import { errorMiddleware } from "./middlewares/error.middleware";
import { PORT } from "./config/env";


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
    this.app.use("/auth", authRouter.getRouter());
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

