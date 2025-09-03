import { Router } from "express";
import { autoInjectable } from "tsyringe";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { env } from "../../config";
import { PeakSeasonController } from "./peakSeasonRate.controller";

@autoInjectable()
export class PeakSeasonRouter {
  private readonly router: Router = Router();

  constructor(
    private readonly peakSeasonController?: PeakSeasonController,
    private readonly jwtMiddleware?: JwtMiddleware
  ) {
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    // CREATE PEAK SEASON RATE
    this.router.post(
      "/",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.peakSeasonController!.createPeakSeasonRate
    );
  };

  getRouter(): Router {
    return this.router;
  }
}
