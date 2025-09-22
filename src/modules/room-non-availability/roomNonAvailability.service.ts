import { areIntervalsOverlapping } from "date-fns";
import { Prisma } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateRoomNonAvailabilityBody {
  reason: string;
  startDate: Date;
  endDate: Date;
  roomId: number;
}

export interface GetRoomNonAvailabilitiesQuery {
  take?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  reason?: string;
  startDate?: Date;
  endDate?: Date;
  roomId?: number;
}

export interface UpdateRoomNonAvailabilityBody {
  reason?: string;
  startDate?: Date;
  endDate?: Date;
  roomId?: number;
}

export class RoomNonAvailabilityService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createRoomNonAvailability = async (
    userId: number,
    body: {
      reason: string;
      startDate: Date;
      endDate: Date;
      roomId: number;
    }
  ) => {
    const { reason, startDate, endDate, roomId } = body;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError("User not found", 404);

    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { property: { include: { tenant: true } } },
    });
    if (!room) throw new ApiError("Room not found", 404);

    if (room.property.tenant.userId !== userId) {
      throw new ApiError(
        "You don't have permission to create non-availability",
        403
      );
    }

    const existingNonAvailabilities =
      await this.prisma.roomNonAvailability.findMany({ where: { roomId } });

    const inputInterval = {
      start: new Date(startDate),
      end: new Date(endDate),
    };

    for (const item of existingNonAvailabilities) {
      const overlap =
        inputInterval.start < item.endDate &&
        inputInterval.end > item.startDate;
      if (overlap) {
        throw new ApiError(
          "Room Non Availability for that interval already exists",
          400
        );
      }
    }

    const newNonAvailability = await this.prisma.roomNonAvailability.create({
      data: {
        reason,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        roomId,
      },
    });

    return {
      message: "Create Room Non Availability success",
      data: newNonAvailability,
    };
  };

  getRoomNonAvailabilities = async (
    query: GetRoomNonAvailabilitiesQuery,
    userId: number
  ) => {
    const {
      take = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "asc",
      search,
      reason,
      startDate,
      endDate,
      roomId,
    } = query;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError("User not found", 404);
    if (user.role !== "TENANT")
      throw new ApiError("User doesn't have access", 403);

    const tenant = await this.prisma.tenant.findFirst({
      where: { userId: user.id, isDeleted: false },
    });
    if (!tenant) throw new ApiError("Tenant not found", 404);

    const whereClause: Prisma.RoomNonAvailabilityWhereInput = {
      isDeleted: false,
      room: { property: { tenantId: tenant.id } },
      ...(roomId ? { roomId } : {}),
      ...(reason ? { reason: { contains: reason, mode: "insensitive" } } : {}),
      ...(search
        ? { OR: [{ reason: { contains: search, mode: "insensitive" } }] }
        : {}),
      ...(startDate ? { startDate: { gte: new Date(startDate) } } : {}),
      ...(endDate ? { endDate: { lte: new Date(endDate) } } : {}),
    };

    const roomNonAvailabilities =
      await this.prisma.roomNonAvailability.findMany({
        where: whereClause,
        skip: (page - 1) * take,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: { room: true },
      });

    const count = await this.prisma.roomNonAvailability.count({
      where: whereClause,
    });

    return { data: roomNonAvailabilities, meta: { page, take, total: count } };
  };

  updateRoomNonAvailability = async (
    id: number,
    body: Partial<UpdateRoomNonAvailabilityBody>
  ) => {
    const existingRecord = await this.prisma.roomNonAvailability.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      throw new ApiError("Room Non Availability not found", 404);
    }

    if (body.startDate && body.endDate && body.roomId) {
      const newInterval = {
        start: new Date(body.startDate),
        end: new Date(body.endDate),
      };

      const otherIntervals = await this.prisma.roomNonAvailability.findMany({
        where: { roomId: body.roomId, NOT: { id }, isDeleted: false },
      });

      for (const interval of otherIntervals) {
        const overlap = areIntervalsOverlapping(newInterval, {
          start: new Date(interval.startDate),
          end: new Date(interval.endDate),
        });
        if (overlap) {
          throw new ApiError(
            "The new non-availability interval overlaps with an existing one",
            400
          );
        }
      }
    }

    const updatedRecord = await this.prisma.roomNonAvailability.update({
      where: { id },
      data: body,
    });

    return {
      message: "Update Room Non Availability Success",
      data: updatedRecord,
    };
  };

  deleteRoomNonAvailability = async (id: number) => {
    const existingRecord = await this.prisma.roomNonAvailability.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      throw new ApiError("Room Non Availability not found", 404);
    }

    const deletedRecord = await this.prisma.roomNonAvailability.delete({
      where: { id },
    });

    return {
      message: "Delete Room Non Availability Success",
      data: deletedRecord,
    };
  };
}
