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

@injectable()
export class PeakSeasonService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE PEAK SEASON RATE =================
  createPeakSeason = async (userId: number, body: CreatePeakSeasonBody) => {
    const { price, startDate, endDate, roomId } = body;

    if (!userId) {
      throw new ApiError(`User ${userId} not found`, 404);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isDeleted) {
      throw new ApiError("User not found", 404);
    }

    if (user.role !== Role.TENANT) {
      throw new ApiError("User doesn't have access", 403);
    }

    // Validasi input
    if (price <= 0) {
      throw new ApiError("Price must be greater than 0", 400);
    }

    if (new Date(startDate) > new Date(endDate)) {
      throw new ApiError("Start date must be before end date", 400);
    }

    const room = await this.prisma.room.findFirst({
      where: { id: roomId },
      include: {
        property: {
          include: { tenant: true },
        },
      },
    });

    if (!room) {
      throw new ApiError("Room not found", 404);
    }

    if (room.property.tenant.userId !== userId) {
      throw new ApiError(
        "Unauthorized: Room does not belong to this tenant",
        403
      );
    }

    // Cek overlapping peak season
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

      if (overlap) {
        throw new ApiError(
          "Peak Season Rate already exists for this date range",
          400
        );
      }
    }

    // Buat peak season baru
    const newPeak = await this.prisma.peakSeasonRate.create({
      data: {
        roomId,
        price,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return {
      message: "Peak Season Rate created successfully",
      data: newPeak,
    };
  };
}
