import { Router } from "express";
import { env } from "../../config";
import { isTenant } from "../../lib/isTenant";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";

export class CategoryRouter {
  private readonly router: Router = Router();
  private readonly categoryController: CategoryController;
  private readonly jwtMiddleware: JwtMiddleware;

  constructor() {
    const categoryService = new CategoryService();
    this.categoryController = new CategoryController();
    this.jwtMiddleware = new JwtMiddleware();

    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.categoryController.createCategory
    );

    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.categoryController.getCategoryList
    );

    this.router.get("/list", this.categoryController.getAllCategoryList);

    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.categoryController.deleteCategory
    );

    this.router.put(
      "/:id",
      this.jwtMiddleware.verifyToken(env().JWT_SECRET!),
      isTenant,
      this.categoryController.updateCategory
    );
  };

  getRouter(): Router {
    return this.router;
  }
}
