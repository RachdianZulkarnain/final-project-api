import { NextFunction, Request, Response } from "express";
import { PeakSeasonService } from "./peakSeasonRate.service";

export class PeakSeasonController {
  private peakSeasonService: PeakSeasonService;

  constructor() {
    this.peakSeasonService = new PeakSeasonService();
  }

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

      res.status(201).json({
        message: "Peak Season Rate created successfully",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  getPeakSeasonsRate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = {
        take: parseInt(req.query.take as string) || 10,
        page: parseInt(req.query.page as string) || 1,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder:
          req.query.sortOrder === "asc" || req.query.sortOrder === "desc"
            ? (req.query.sortOrder as "asc" | "desc")
            : "asc",
        search: (req.query.search as string) || undefined,
        price: req.query.price ? Number(req.query.price) : undefined,
        roomId: req.query.roomId ? Number(req.query.roomId) : undefined,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
      };

      const result = await this.peakSeasonService.getPeakSeasons(
        query,
        Number(res.locals.user.id)
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  updatePeakSeasonRate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.peakSeasonService.updatePeakSeasonRate(
        Number(res.locals.user.id),
        Number(req.params.id),
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  deletePeakSeasonRate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.peakSeasonService.deletePeakSeasonRate(
        Number(res.locals.user.id),
        Number(req.params.id)
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
