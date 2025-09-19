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
    this.router.get("/", this.propertyController!.getPropertiesController);

    this.router.get("/search", this.propertyController!.getPropertiesByQuery);

    this.router.get(
      "/tenant",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.propertyController!.getTenantProperties
    );

    this.router.get(
      "/tenant/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.propertyController!.getPropertyTenant
    );

    this.router.post(
      "/",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      uploader().array("imageUrl", 10),
      this.propertyController!.createProperty
    );

    this.router.patch(
      "/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      uploader().array("imageUrl", 10),
      this.propertyController!.updateProperty
    );

    this.router.delete(
      "/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.propertyController!.deleteProperty
    );

    this.router.get("/:slug", this.propertyController!.getPropertyController);
  };

  getRouter(): Router {
    return this.router;
  }
}
