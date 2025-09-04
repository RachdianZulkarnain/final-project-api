import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import { CategoryService } from "./category.service";

@injectable()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // ================= CREATE CATEGORY =================
  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(res.locals.user.id);
      const body = req.body;

      const result = await this.categoryService.createCategory(body, userId);

      res.status(200).send({
        message: "Category created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ================= GET CATEGORY LIST =================
  getCategoryList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const take = parseInt(req.query.take as string) || 7;
      const page = parseInt(req.query.page as string) || 1;
      const sortBy = (req.query.sortBy as string) || "createdAt";

      let sortOrder: "asc" | "desc" = "desc";
      if (req.query.sortOrder === "asc") sortOrder = "asc";
      if (req.query.sortOrder === "desc") sortOrder = "desc";

      const search = (req.query.search as string) || "";
      const propertyCategoryId =
        parseInt(req.query.propertyCategoryId as string) || 1;

      const query = {
        take,
        page,
        sortBy,
        sortOrder,
        search,
        propertyCategoryId,
      };

      const userId = Number(res.locals.user.id);
      const result = await this.categoryService.getCategories(query, userId);

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  // ================= DELETE CATEGORY =================
  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryId = Number(req.params.id);
      const result = await this.categoryService.deleteCategory(categoryId);

      res.status(200).send({
        message: "Delete category success",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ================= UPDATE CATEGORY =================
  updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryId = Number(req.params.id);
      const body = req.body;

      const result = await this.categoryService.updateCategory(
        categoryId,
        body
      );

      res.status(200).send({
        message: "Update category success",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ================= GET ALL CATEGORY LIST =================
  getAllCategoryList = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = {
        take: parseInt(req.query.take as string) || 7,
        page: parseInt(req.query.page as string) || 1,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder: ((req.query.sortOrder as string) === "desc"
          ? "desc"
          : "asc") as "asc" | "desc",
        search: (req.query.search as string) || "",
        propertyCategoryId:
          parseInt(req.query.propertyCategoryId as string) || 1,
      };

      const result = await this.categoryService.getAllCategories(query);

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
