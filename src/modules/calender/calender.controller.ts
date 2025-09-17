import { NextFunction, Request, Response } from "express";
import { CalendarService } from "./calender.service";

export class CalendarController {
  private calendarService: CalendarService;

  constructor() {
    this.calendarService = new CalendarService();
  }

  // ================= GET MONTHLY CALENDAR =================
  getMonthlyCalendar = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { roomId } = req.params;
      let { date } = req.query;

      let parsedDate: Date;
      if (!date) {
        parsedDate = new Date();
      } else {
        parsedDate = new Date(date as string);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date format. Please use YYYY-MM-DD format.",
          });
        }
      }
      parsedDate.setDate(1);
      parsedDate.setHours(0, 0, 0, 0);

      const calendarData =
        await this.calendarService.getMonthlyAvailabilityAndPricing(
          parseInt(roomId),
          parsedDate
        );

      res.status(200).json({
        success: true,
        data: calendarData,
      });
    } catch (error) {
      next(error);
    }
  };

  // ================= COMPARE ROOM PRICING =================
  compareRoomPricing = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { roomIds, startDate, endDate } = req.body;

      if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid array of room IDs",
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Both startDate and endDate are required",
        });
      }

      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Please use YYYY-MM-DD format.",
        });
      }

      if (parsedStartDate > parsedEndDate) {
        return res.status(400).json({
          success: false,
          message: "startDate must be before or equal to endDate",
        });
      }

      const comparisonData = await this.calendarService.compareRoomPricing(
        roomIds.map((id: string | number) => Number(id)),
        parsedStartDate,
        parsedEndDate
      );

      res.status(200).json({
        success: true,
        data: comparisonData,
      });
    } catch (error) {
      next(error);
    }
  };

  // ================= GET PROPERTY MONTHLY PRICE COMPARISON =================
  getPropertyMonthlyPriceComparison = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { propertyId } = req.params;
      let { date } = req.query;

      let parsedDate: Date;
      if (!date) {
        parsedDate = new Date();
      } else {
        parsedDate = new Date(date as string);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date format. Please use YYYY-MM-DD format.",
          });
        }
      }

      const result =
        await this.calendarService.getPropertyMonthlyPriceComparison(
          parseInt(propertyId),
          parsedDate
        );

      res.status(200).json({
        success: true,
        propertyId: parseInt(propertyId),
        month: `${parsedDate.getFullYear()}-${String(
          parsedDate.getMonth() + 1
        ).padStart(2, "0")}`,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };
}
