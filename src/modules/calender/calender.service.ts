import { CalendarData, RoomPriceComparison } from "../../types/calendar";
import { ApiError } from "../../utils/api-error";
import {
  calculateAveragePrice,
  generateCalendarData,
  getDailyPrices,
} from "../../utils/calendar.utils";
import { PrismaService } from "../prisma/prisma.service";

export class CalendarService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  // ================= GET MONTHLY AVAILABILITY AND PRICING =================
  getMonthlyAvailabilityAndPricing = async (
    roomId: number,
    startDate: Date
  ) => {
    if (!roomId) {
      throw new ApiError("Room ID is required", 400);
    }

    const date = startDate instanceof Date ? startDate : new Date(startDate);
    const endDate = new Date(date);
    endDate.setMonth(date.getMonth() + 1);

    try {
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
        select: {
          id: true,
          price: true,
          stock: true,
          peakSeasonRate: {
            where: {
              isDeleted: false,
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: date } },
              ],
            },
            select: {
              price: true,
              startDate: true,
              endDate: true,
            },
          },
          roomNonAvailability: {
            where: {
              isDeleted: false,
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: date } },
              ],
            },
            select: {
              startDate: true,
              endDate: true,
              reason: true,
            },
          },
        },
      });

      if (!room) {
        throw new ApiError(`Room with ID ${roomId} not found`, 404);
      }

      const calendarData: CalendarData = generateCalendarData(
        date,
        endDate,
        room.price,
        room.stock,
        room.peakSeasonRate,
        room.roomNonAvailability
      );

      return {
        roomId: room.id,
        basePrice: room.price,
        calendar: calendarData,
      };
    } catch (error) {
      console.error(
        "Error in CalendarService.getMonthlyAvailabilityAndPricing:",
        error
      );
      throw new ApiError("Failed to get monthly availability and pricing", 500);
    }
  };

  // ================= COMPARE ROOM PRICING =================
  compareRoomPricing = async (
    roomIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<RoomPriceComparison[]> => {
    if (!roomIds || roomIds.length === 0) {
      throw new ApiError("No room IDs provided", 400);
    }

    try {
      const rooms = await this.prisma.room.findMany({
        where: {
          id: { in: roomIds },
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
          propertyId: true,
          peakSeasonRate: {
            where: {
              isDeleted: false,
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: startDate } },
              ],
            },
            select: {
              price: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      if (!rooms || rooms.length === 0) {
        throw new ApiError("No rooms found for the given IDs", 404);
      }

      const comparisonData: RoomPriceComparison[] = rooms.map((room) => {
        const dailyPrices = getDailyPrices(
          startDate,
          endDate,
          room.price,
          room.peakSeasonRate
        );

        const priceValues = Object.values(dailyPrices);

        return {
          roomId: room.id,
          name: room.name,
          type: room.type,
          propertyId: room.propertyId,
          basePrice: room.price,
          averagePrice: calculateAveragePrice(dailyPrices),
          minimumPrice:
            priceValues.length > 0 ? Math.min(...priceValues) : room.price,
          maximumPrice:
            priceValues.length > 0 ? Math.max(...priceValues) : room.price,
          dailyPrices,
        };
      });

      return comparisonData;
    } catch (error) {
      console.error("Error in CalendarService.compareRoomPricing:", error);
      throw new ApiError("Failed to compare room pricing", 500);
    }
  };

  // ================= GET PROPERTY MONTHLY PRICE COMPARISON =================
  getPropertyMonthlyPriceComparison = async (
    propertyId: number,
    date: Date
  ) => {
    if (!propertyId) {
      throw new ApiError("Property ID is required", 400);
    }

    try {
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const rooms = await this.prisma.room.findMany({
        where: {
          propertyId,
          isDeleted: false,
        },
        select: { id: true },
      });

      if (!rooms || rooms.length === 0) {
        throw new ApiError(
          `No rooms found for property with ID ${propertyId}`,
          404
        );
      }

      const roomIds = rooms.map((room) => room.id);

      const comparisonData = await this.compareRoomPricing(
        roomIds,
        startDate,
        endDate
      );

      return {
        propertyId,
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`,
        data: comparisonData,
      };
    } catch (error) {
      console.error(
        "Error in CalendarService.getPropertyMonthlyPriceComparison:",
        error
      );
      throw new ApiError(
        "Failed to get property monthly price comparison",
        500
      );
    }
  };
}
