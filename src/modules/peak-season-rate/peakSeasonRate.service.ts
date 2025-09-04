import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { Prisma, Role } from "../../generated/prisma";
import { areIntervalsOverlapping } from "date-fns";

interface CreatePeakSeasonBody {
  price: number;
  startDate: Date;
  endDate: Date;
  roomId: number;
}

interface UpdatePeakSeasonBody {
  price?: number;
  startDate?: Date;
  endDate?: Date;
  roomId?: number;
}

interface GetPeakSeasonsQuery {
  take?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  price?: number;
  startDate?: Date;
  endDate?: Date;
  roomId?: number;
}

@injectable()
export class PeakSeasonService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE PEAK SEASON RATE =================
  createPeakSeason = async (userId: number, body: CreatePeakSeasonBody) => {
    const { price, startDate, endDate, roomId } = body;

    if (!userId) throw new ApiError(`User ${userId} not found`, 404);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) throw new ApiError("User not found", 404);
    if (user.role !== Role.TENANT)
      throw new ApiError("User doesn't have access", 403);

    if (price <= 0) throw new ApiError("Price must be greater than 0", 400);
    if (new Date(startDate) > new Date(endDate))
      throw new ApiError("Start date must be before end date", 400);

    const room = await this.prisma.room.findFirst({
      where: { id: roomId },
      include: { property: { include: { tenant: true } } },
    });
    if (!room) throw new ApiError("Room not found", 404);
    if (room.property.tenant.userId !== userId)
      throw new ApiError(
        "Unauthorized: Room does not belong to this tenant",
        403
      );

    const existingPeaks = await this.prisma.peakSeasonRate.findMany({
      where: { roomId, isDeleted: false },
    });

    const inputInterval = {
      start: new Date(startDate),
      end: new Date(endDate),
    };
    for (const peak of existingPeaks) {
      const overlap = areIntervalsOverlapping(inputInterval, {
        start: new Date(peak.startDate),
        end: new Date(peak.endDate),
      });
      if (overlap)
        throw new ApiError(
          "Peak Season Rate already exists for this date range",
          400
        );
    }

    const newPeak = await this.prisma.peakSeasonRate.create({
      data: {
        roomId,
        price,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return { message: "Peak Season Rate created successfully", data: newPeak };
  };

  // ================= GET PEAK SEASON RATES =================
  getPeakSeasons = async (query: GetPeakSeasonsQuery, userId: number) => {
    const {
      take = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "asc",
    } = query;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError("User not found", 404);
    if (user.role !== Role.TENANT)
      throw new ApiError("User doesn't have access", 403);

    const tenant = await this.prisma.tenant.findFirst({
      where: { userId: user.id, isDeleted: false },
    });
    if (!tenant) throw new ApiError("Tenant not found", 404);

    const whereClause: Prisma.PeakSeasonRateWhereInput = {
      isDeleted: false,
      room: { property: { tenantId: tenant.id } },
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.price ? { price: query.price } : {}),
      ...(query.startDate ? { startDate: { gte: query.startDate } } : {}),
      ...(query.endDate ? { endDate: { lte: query.endDate } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                room: { name: { contains: query.search, mode: "insensitive" } },
              },
            ],
          }
        : {}),
    };

    const data = await this.prisma.peakSeasonRate.findMany({
      where: whereClause,
      skip: (page - 1) * take,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: { room: true },
    });

    const total = await this.prisma.peakSeasonRate.count({
      where: whereClause,
    });

    return { data, meta: { page, take, total } };
  };

  // ================= UPDATE PEAK SEASON RATE =================
  updatePeakSeasonRate = async (
    userId: number,
    id: number,
    body: UpdatePeakSeasonBody
  ) => {
    const { price, startDate, endDate, roomId } = body;

    const peakSeason = await this.prisma.peakSeasonRate.findUnique({
      where: { id },
      include: {
        room: { include: { property: { include: { tenant: true } } } },
      },
    });

    if (!peakSeason) throw new ApiError("Peak Season Rate not found", 404);
    if (peakSeason.room.property.tenant.userId !== userId)
      throw new ApiError(
        "Unauthorized: Peak Season Rate does not belong to this tenant",
        403
      );

    if (startDate && endDate) {
      const otherPeaks = await this.prisma.peakSeasonRate.findMany({
        where: { roomId: peakSeason.roomId, id: { not: id }, isDeleted: false },
      });

      const inputInterval = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
      for (const peak of otherPeaks) {
        const overlap = areIntervalsOverlapping(inputInterval, {
          start: new Date(peak.startDate),
          end: new Date(peak.endDate),
        });
        if (overlap)
          throw new ApiError(
            "Peak Season Rate already exists for this date range",
            400
          );
      }
    }

    const updatedPeak = await this.prisma.peakSeasonRate.update({
      where: { id },
      data: body,
    });

    return {
      message: "Peak Season Rate updated successfully",
      data: updatedPeak,
    };
  };

  // ================= DELETE PEAK SEASON RATE =================
  deletePeakSeasonRate = async (userId: number, id: number) => {
    const peakSeason = await this.prisma.peakSeasonRate.findUnique({
      where: { id },
      include: {
        room: { include: { property: { include: { tenant: true } } } },
      },
    });

    if (!peakSeason) throw new ApiError("Peak Season Rate not found", 404);

    if (peakSeason.room.property.tenant.userId !== userId)
      throw new ApiError(
        "Unauthorized: Peak Season Rate does not belong to this tenant",
        403
      );

    const deletedPeak = await this.prisma.peakSeasonRate.delete({
      where: { id },
    });

    return {
      message: "Peak Season Rate deleted successfully",
      data: deletedPeak,
    };
  };
}
