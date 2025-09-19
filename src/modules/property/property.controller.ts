// src/modules/property/property.controller.ts
import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PropertyService } from "./property.service";

@injectable()
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  createProperty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(res.locals.user.id);
      const files = req.files as Express.Multer.File[];
      const body = req.body;
      const result = await this.propertyService.createProperty(
        body,
        files,
        userId
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateProperty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(res.locals.user.id);
      const propertyId = Number(req.params.id);
      const files = req.files as Express.Multer.File[];
      const body = req.body;

      const result = await this.propertyService.updateProperty(
        userId,
        propertyId,
        body,
        files
      );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getPropertyController = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { slug } = req.params;
      const result = await this.propertyService.getPropertyBySlug(slug);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getPropertiesController = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = {
        take: parseInt(req.query.take as string) || 8,
        page: parseInt(req.query.page as string) || 1,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder: (req.query.sortOrder as string) || "desc",
        search: (req.query.search as string) || "",
        guest: req.query.guest ? Number(req.query.guest) : undefined,
        startDate: req.query.startDate
          ? (req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate ? (req.query.endDate as string) : undefined,
        location: (req.query.location as string) || undefined,
        category: (req.query.category as string) || undefined,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
      };

      const properties = await this.propertyService.getPropertiesAdvanced(
        query
      );

      res.status(200).json({
        message: "Success get property list",
        data: properties,
      });
    } catch (error) {
      next(error);
    }
  };

  getPropertiesByQuery = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = {
        take: parseInt(req.query.take as string) || 10,
        page: parseInt(req.query.page as string) || 1,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder: (req.query.sortOrder as string) || "desc",
        search: (req.query.search as string) || "",
        guest: req.query.guest ? Number(req.query.guest) : 2,
        title: (req.query.title as string) || "",
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
        name: (req.query.name as string) || "",
        price: req.query.price ? Number(req.query.price) : undefined,
      };

      const result = await this.propertyService.getPropertiesByQuery(query);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getTenantProperties = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = {
        take: req.query.take ? Number(req.query.take) : 10,
        page: req.query.page ? Number(req.query.page) : 1,
        search: req.query.search || "",
      };

      const userId = Number(res.locals.user.id);

      const tenant = await this.propertyService.getTenantByUserId(userId);
      if (!tenant) throw new Error("Tenant not found for this user");

      const result = await this.propertyService.getTenantProperties(
        query,
        tenant.id
      );

      res.status(200).json({
        message: "Tenant properties fetched successfully",
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      console.error("Controller getTenantProperties error:", error);
      next(error);
    }
  };

  getPropertyTenant = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const propertyId = Number(req.params.id);
      const result = await this.propertyService.getPropertyTenant(propertyId);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  deleteProperty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const propertyId = Number(req.params.id);
      const userId = Number(res.locals.user.id);

      const result = await this.propertyService.deleteProperty(
        propertyId,
        userId
      );

      res.status(200).json({
        message: "Property deleted successfully",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };
}
