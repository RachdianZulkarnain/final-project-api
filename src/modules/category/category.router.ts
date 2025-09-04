import { Router } from "express";
import { autoInjectable } from "tsyringe";
import { CategoryController } from "./category.controller";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { env } from "../../config";

@autoInjectable()
export class CategoryRouter {
  private readonly router: Router = Router();

  constructor(
    private readonly categoryController?: CategoryController,
    private readonly jwtMiddleware?: JwtMiddleware
  ) {
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    // CREATE CATEGORY
    this.router.post(
      "/",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.categoryController!.createCategory
    );

    // GET CATEGORY LIST (tenant-specific)
    this.router.get(
      "/",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.categoryController!.getCategoryList
    );

    // GET ALL CATEGORY LIST (global, paginated)
    this.router.get("/list", this.categoryController!.getAllCategoryList);

    // DELETE CATEGORY
    this.router.delete(
      "/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.categoryController!.deleteCategory
    );

    // UPDATE CATEGORY
    this.router.put(
      "/:id",
      this.jwtMiddleware!.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.categoryController!.updateCategory
    );
  };

  getRouter(): Router {
    return this.router;
  }
}
