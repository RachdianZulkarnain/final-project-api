import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import { RoomService } from "./room.service";

@injectable()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // ================= CREATE ROOM =================
  createRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse facilities jika dikirim sebagai string
      if (req.body.facilities && typeof req.body.facilities === "string") {
        try {
          req.body.facilities = JSON.parse(req.body.facilities);
        } catch (e) {
          throw new Error("Invalid facilities format. Expected a JSON array.");
        }
      }

      // Pastikan facilities adalah array
      if (!req.body.facilities || !Array.isArray(req.body.facilities)) {
        throw new Error("Facilities must be provided as an array");
      }

      const tenantId = Number(res.locals.user.id);

      const result = await this.roomService.createRoom(
        req.body,
        req.file!,
        tenantId
      );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

}
