import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import { PeakSeasonService } from "./peakSeasonRate.service";

@injectable()
export class PeakSeasonController {
  constructor(private readonly peakSeasonService: PeakSeasonService) {}

  // ================= CREATE PEAK SEASON RATE =================
  createPeakSeasonRate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = Number(res.locals.user.id);
      const body = req.body;

      const result = await this.peakSeasonService.createPeakSeason(
        userId,
        body
      );

      res.status(201).send({
        message: "Peak Season Rate created successfully",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };



}
