// src/modules/property/property.router.ts
import { Router } from "express";
import { autoInjectable } from "tsyringe";
import { env } from "../../config";
import { isTenant } from "../../lib/isTenant";
import { uploader } from "../../lib/multer";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { PropertyController } from "./property.controller";

@autoInjectable()
export class PropertyRouter {
  private readonly router: Router = Router();

  constructor(
    private readonly propertyController?: PropertyController,
    private readonly jwtMiddleware?: JwtMiddleware
  ) {
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    // GET PROPERTIES ADVANCED (public)
    this.router.get("/", this.propertyController!.getPropertiesController);

    // ================= PUBLIC ROUTES =================
    // GET PROPERTIES (by query: search, filter, pagination, etc.)
    this.router.get("/search", this.propertyController!.getPropertiesByQuery);

    // ================= TENANT ROUTES =================
    // GET TENANT PROPERTIES
    this.router.get(
      "/tenant",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.propertyController!.getTenantProperties
    );

    // GET PROPERTY TENANT BY ID
    this.router.get(
      "/tenant/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.propertyController!.getPropertyTenant
    );

    // CREATE PROPERTY
    this.router.post(
      "/",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      uploader().array("imageUrl", 10),
      this.propertyController!.createProperty
    );

    // UPDATE PROPERTY
    this.router.patch(
      "/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      uploader().array("imageUrl", 10),
      this.propertyController!.updateProperty
    );

    // DELETE PROPERTY TENANT BY ID
    this.router.delete(
      "/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.propertyController!.deleteProperty
    );

    // ================= PUBLIC ROUTES (DETAIL) =================
    this.router.get("/:slug", this.propertyController!.getPropertyController);
  };

  getRouter(): Router {
    return this.router;
  }
}
