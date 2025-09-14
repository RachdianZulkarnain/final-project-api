import { Router } from "express";
import { PeakSeasonController } from "./peakSeasonRate.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { env } from "../../config";
import { isTenant } from "../../lib/isTenant";

export class PeakSeasonRouter {
  private router: Router;
  private peakSeasonController: PeakSeasonController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.peakSeasonController = new PeakSeasonController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    // ================= GET PEAK SEASONS =================
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.peakSeasonController.getPeakSeasonsRate
    );

    // ================= CREATE PEAK SEASON RATE =================
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.peakSeasonController.createPeakSeasonRate
    );

    // ================= UPDATE PEAK SEASON RATE =================
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.peakSeasonController.updatePeakSeasonRate
    );

    // ================= DELETE PEAK SEASON RATE =================
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.peakSeasonController.deletePeakSeasonRate
    );
  };

  getRouter = (): Router => {
    return this.router;
  };
}
