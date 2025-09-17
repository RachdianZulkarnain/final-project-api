import { NextFunction, Request, Response } from "express";
import { GetRoomsQuery, RoomService } from "./room.service";

export class RoomController {
  private roomService: RoomService;

  constructor() {
    this.roomService = new RoomService();
  }

  // ================= CREATE ROOM =================
  createRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.facilities && typeof req.body.facilities === "string") {
        try {
          req.body.facilities = JSON.parse(req.body.facilities);
        } catch (e) {
          throw new Error("Invalid facilities format. Expected a JSON array.");
        }
      }

      if (!req.body.facilities || !Array.isArray(req.body.facilities)) {
        throw new Error("Facilities must be provided as an array");
      }

      const tenantId = Number(res.locals.user.id);

      const result = await this.roomService.createRoom(
        req.body,
        req.file!,
        tenantId
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ================= GET ROOMS (GENERAL) =================
  getRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sortOrderRaw = (req.query.sortOrder as string) || "desc";
      const sortOrder: "asc" | "desc" =
        sortOrderRaw.toLowerCase() === "asc" ? "asc" : "desc";

      const query: GetRoomsQuery = {
        take: parseInt(req.query.take as string) || 10,
        page: parseInt(req.query.page as string) || 1,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder,
        search: (req.query.search as string) || "",
      };

      const result = await this.roomService.getRooms(query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ================= GET ROOMS (TENANT) =================
  getRoomsTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sortOrderRaw = (req.query.sortOrder as string) || "desc";
      const sortOrder: "asc" | "desc" =
        sortOrderRaw.toLowerCase() === "asc" ? "asc" : "desc";

      const query: GetRoomsQuery = {
        take: parseInt(req.query.take as string) || 10,
        page: parseInt(req.query.page as string) || 1,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder,
        search: (req.query.search as string) || "",
      };

      const result = await this.roomService.getRoomsTenant(
        query,
        Number(res.locals.user.id)
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ================= GET ROOM BY ID =================
  getRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.roomService.getRoom(Number(req.params.id));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ================= UPDATE ROOM =================
  updateRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.facilities && typeof req.body.facilities === "string") {
        try {
          req.body.facilities = JSON.parse(req.body.facilities);
        } catch (e) {
          throw new Error("Invalid facilities format. Expected a JSON array.");
        }
      }

      if (
        req.body.facilities !== undefined &&
        !Array.isArray(req.body.facilities)
      ) {
        throw new Error("Facilities must be provided as an array");
      }

      const result = await this.roomService.updateRoom(
        Number(req.params.id),
        req.body,
        req.file!
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // ================= DELETE ROOM =================
  deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.roomService.deleteRoom(
        Number(req.params.id),
        Number(res.locals.user.id)
      );

      res.status(200).json({ message: "Delete room success", result });
    } catch (error) {
      next(error);
    }
  };
}
