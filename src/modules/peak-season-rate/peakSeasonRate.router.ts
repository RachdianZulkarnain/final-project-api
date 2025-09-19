import { Router } from "express";
import { env } from "../../config";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { PeakSeasonController } from "./peakSeasonRate.controller";

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
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.peakSeasonController.getPeakSeasonsRate
    );

    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.peakSeasonController.createPeakSeasonRate
    );

    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET),
      isTenant,
      this.peakSeasonController.updatePeakSeasonRate
    );

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
