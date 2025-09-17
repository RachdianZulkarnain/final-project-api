import { Prisma, PropertyCategory, Role } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";

interface CreateCategoryBody {
  name: string;
}

interface GetCategoriesQuery {
  page: number;
  take: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search?: string;
}

export class CategoryService {
  private readonly prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }
  // ================= CREATE CATEGORY =================
  createCategory = async (
    body: CreateCategoryBody,
    userId: number
  ): Promise<PropertyCategory> => {
    const { name } = body;

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

    const tenant = await this.prisma.tenant.findFirst({
      where: { userId: user.id, isDeleted: false },
    });

    if (!tenant) {
      throw new ApiError("Tenant not found", 404);
    }

    // check if deleted category exists → restore it
    const deletedCategory = await this.prisma.propertyCategory.findFirst({
      where: {
        name,
        tenantId: tenant.id,
        isDeleted: true,
      },
    });

    if (deletedCategory) {
      return this.prisma.propertyCategory.update({
        where: { id: deletedCategory.id },
        data: { isDeleted: false },
      });
    }

    // check if category already exists (not deleted)
    const existingCategory = await this.prisma.propertyCategory.findFirst({
      where: {
        name,
        tenantId: tenant.id,
        isDeleted: false,
      },
    });

    if (existingCategory) {
      throw new ApiError("Category already exists for this tenant", 400);
    }

    return this.prisma.propertyCategory.create({
      data: {
        name,
        tenantId: tenant.id,
        isDeleted: false,
      },
    });
  };

  // ================= GET CATEGORIES =================
  getCategories = async (query: GetCategoriesQuery, userId: number) => {
    const { take, page, sortBy, sortOrder, search } = query;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isDeleted) {
      throw new ApiError("User not found", 404);
    }

    if (user.role !== Role.TENANT) {
      throw new ApiError("User doesn't have access", 403);
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { userId: user.id, isDeleted: false },
    });

    if (!tenant) {
      throw new ApiError("Tenant not found", 404);
    }

    const whereClause: Prisma.PropertyCategoryWhereInput = {
      tenantId: tenant.id,
      isDeleted: false,
    };

    if (search) {
      whereClause.name = { contains: search };
    }

    const categories = await this.prisma.propertyCategory.findMany({
      where: whereClause,
      skip: (page - 1) * take,
      take,
      orderBy: { [sortBy]: sortOrder },
    });

    const count = await this.prisma.propertyCategory.count({
      where: whereClause,
    });

    return {
      data: categories,
      meta: { page, take, total: count },
    };
  };

  // ================= DELETE CATEGORY =================
  deleteCategory = async (id: number) => {
    const category = await this.prisma.propertyCategory.findFirst({
      where: { id, isDeleted: false },
      include: {
        properties: { where: { isDeleted: false } },
      },
    });

    if (!category) {
      throw new ApiError("Category not found", 404);
    }

    if (category.properties.length > 0) {
      throw new ApiError(
        "Cannot delete category with associated properties",
        400
      );
    }

    const deletedCategory = await this.prisma.propertyCategory.update({
      where: { id },
      data: { isDeleted: true },
    });

    return {
      message: "Category deleted successfully",
      data: deletedCategory,
    };
  };

  // ================= UPDATE CATEGORY =================
  updateCategory = async (id: number, body: Pick<PropertyCategory, "name">) => {
    const { name } = body;

    const category = await this.prisma.propertyCategory.findFirst({
      where: { id, isDeleted: false },
      include: { tenant: true },
    });

    if (!category) {
      throw new ApiError("Category not found", 404);
    }

    if (name !== category.name) {
      // cek category aktif dengan nama sama
      const existingActiveCategory =
        await this.prisma.propertyCategory.findFirst({
          where: {
            name,
            tenantId: category.tenantId,
            isDeleted: false,
            id: { not: id },
          },
        });

      if (existingActiveCategory) {
        throw new ApiError("Category name already exists for this tenant", 400);
      }

      // hapus category deleted dengan nama sama
      const existingDeletedCategory =
        await this.prisma.propertyCategory.findFirst({
          where: {
            name,
            tenantId: category.tenantId,
            isDeleted: true,
          },
        });

      if (existingDeletedCategory) {
        await this.prisma.propertyCategory.delete({
          where: { id: existingDeletedCategory.id },
        });
      }
    }

    const updatedCategory = await this.prisma.propertyCategory.update({
      where: { id },
      data: { name },
    });

    return {
      message: "Update property category success",
      data: updatedCategory,
    };
  };

  // ================= GET ALL CATEGORIES =================
  getAllCategories = async (query: {
    page: number;
    take: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
    search?: string;
  }) => {
    const { take, page, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.PropertyCategoryWhereInput = {
      isDeleted: false,
    };

    if (search) {
      whereClause.name = { contains: search };
    }

    const categories = await this.prisma.propertyCategory.findMany({
      where: whereClause,
      skip: (page - 1) * take,
      take,
      orderBy: { [sortBy]: sortOrder },
    });

    const count = await this.prisma.propertyCategory.count({
      where: whereClause,
    });

    return {
      data: categories,
      meta: { page, take, total: count },
    };
  };
}
