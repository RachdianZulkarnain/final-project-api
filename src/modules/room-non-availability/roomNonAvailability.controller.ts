// room-non-availability.controller.ts
import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import {
  CreateRoomNonAvailabilityBody,
  GetRoomNonAvailabilitiesQuery,
  UpdateRoomNonAvailabilityBody,
  RoomNonAvailabilityService,
} from "./roomNonAvailability.service";

@injectable()
export class RoomNonAvailabilityController {
  constructor(
    private readonly roomNonAvailabilityService: RoomNonAvailabilityService
  ) {}

  // ================= CREATE ROOM NON AVAILABILITY =================
  createRoomNonAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = Number(res.locals.user.id);

      const payload: CreateRoomNonAvailabilityBody = {
        reason: req.body.reason,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        roomId: Number(req.body.roomId),
      };

      const result =
        await this.roomNonAvailabilityService.createRoomNonAvailability(
          userId,
          payload
        );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  // ================= GET ROOM NON AVAILABILITIES =================
  getRoomNonAvailabilities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query: GetRoomNonAvailabilitiesQuery = {
        take: parseInt(req.query.take as string) || 10,
        page: parseInt(req.query.page as string) || 1,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder: (req.query.sortOrder as string) === "asc" ? "asc" : "desc",
        search: (req.query.search as string) || undefined,
        reason: (req.query.reason as string) || undefined,
        roomId: req.query.roomId ? Number(req.query.roomId) : undefined,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
      };

      const result =
        await this.roomNonAvailabilityService.getRoomNonAvailabilities(
          query,
          Number(res.locals.user.id)
        );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  // ================= UPDATE ROOM NON AVAILABILITY =================
  updateRoomNonAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const payload: UpdateRoomNonAvailabilityBody = {
        reason: req.body.reason,
        startDate: req.body.startDate
          ? new Date(req.body.startDate)
          : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        roomId: req.body.roomId ? Number(req.body.roomId) : undefined,
      };

      const result =
        await this.roomNonAvailabilityService.updateRoomNonAvailability(
          Number(req.params.id),
          payload
        );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  // ================= DELETE ROOM NON AVAILABILITY =================
  deleteRoomNonAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result =
        await this.roomNonAvailabilityService.deleteRoomNonAvailability(
          Number(req.params.id)
        );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
