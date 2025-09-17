// src/modules/property/property.service.ts
import { injectable } from "tsyringe";
import { Prisma, Property, Role, StatusProperty } from "../../generated/prisma";
import { PaginationQueryParams } from "../../types/pagination";
import { ApiError } from "../../utils/api-error";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PrismaService } from "../prisma/prisma.service";

interface CreatePropertyBody {
  title: string;
  slug: string;
  description: string;
  latitude: string;
  longitude: string;
  propertyCategoryId: string | number;
  location: string;
}

interface UpdatePropertyBody {
  title?: string;
  slug?: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  propertyCategoryId?: string | number;
  location?: string;
  status?: StatusProperty;
}

interface GetPropertiesQuery extends PaginationQueryParams {
  search?: string;
  startDate?: Date;
  endDate?: Date;
  guest?: number;
  title?: string;
  name?: string;
  price?: number;
}

interface GetPropertyQuery extends PaginationQueryParams {
  location?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  search?: string;
  guest?: number;
  priceMin?: number;
  priceMax?: number;
}

@injectable()
export class PropertyService {
  private cloudinaryService = new CloudinaryService();

  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE PROPERTY =================
  createProperty = async (
    body: CreatePropertyBody,
    files: Express.Multer.File[],
    userId: number
  ): Promise<Property> => {
    const {
      title,
      slug,
      description,
      latitude,
      longitude,
      propertyCategoryId,
      location,
    } = body;

    const categoryId = Number(propertyCategoryId);
    if (isNaN(categoryId))
      throw new ApiError("Invalid property category ID", 400);

    const existingProperty = await this.prisma.property.findUnique({
      where: { slug },
    });
    if (existingProperty) throw new ApiError("Slug already exists", 400);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) throw new ApiError("User not found", 404);
    if (user.role !== Role.TENANT)
      throw new ApiError(
        "User doesn't have permission to create properties",
        403
      );

    const tenant = await this.prisma.tenant.findFirst({
      where: { userId: user.id },
    });
    if (!tenant || tenant.isDeleted)
      throw new ApiError("Tenant profile not found", 404);

    const categoryExists = await this.prisma.propertyCategory.findUnique({
      where: { id: categoryId },
    });
    if (!categoryExists) throw new ApiError("Property category not found", 404);

    const imageResults =
      files && files.length > 0
        ? await Promise.all(
            files.map((file) =>
              this.cloudinaryService.upload(file, "properties")
            )
          )
        : [];

    const property = await this.prisma.$transaction(async (tx) => {
      const newProperty = await tx.property.create({
        data: {
          title,
          slug,
          description,
          latitude,
          longitude,
          location,
          propertyCategoryId: categoryId,
          tenantId: tenant.id,
          status: StatusProperty.PUBLISHED,
          isDeleted: false,
        },
        include: { propertyImage: true, propertyCategory: true, tenant: true },
      });

      if (imageResults.length > 0) {
        await Promise.all(
          imageResults
            .filter((res) => res.secure_url)
            .map((res) =>
              tx.propertyImage.create({
                data: {
                  imageUrl: res.secure_url!,
                  propertyId: newProperty.id,
                  isDeleted: false,
                },
              })
            )
        );
      }

      return newProperty;
    });

    return property;
  };

  // ================= UPDATE PROPERTY =================
  updateProperty = async (
    userId: number,
    propertyId: number,
    body: Partial<UpdatePropertyBody>,
    files?: Express.Multer.File[]
  ) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new ApiError("User not found", 404);
    if (user.role !== Role.TENANT)
      throw new ApiError("User doesn't have access", 403);

    const tenant = await this.prisma.tenant.findFirst({
      where: { userId: user.id, isDeleted: false },
    });
    if (!tenant) throw new ApiError("Tenant not found", 404);

    const currentProperty = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: tenant.id, isDeleted: false },
      include: { propertyImage: true, propertyCategory: true },
    });
    if (!currentProperty) throw new ApiError("Property not found", 404);

    let imageResults: { secure_url: string }[] = [];
    if (files && files.length > 0) {
      imageResults = await Promise.all(
        files.map((file) => this.cloudinaryService.upload(file, "properties"))
      );
    }

    const updateData: Prisma.PropertyUpdateInput = {
      ...(body.title && { title: body.title }),
      ...(body.slug && { slug: body.slug }),
      ...(body.description && { description: body.description }),
      ...(body.latitude && { latitude: body.latitude }),
      ...(body.longitude && { longitude: body.longitude }),
      ...(body.location && { location: body.location }),
      ...(body.status && { status: body.status }),
      ...(body.propertyCategoryId && {
        propertyCategory: { connect: { id: Number(body.propertyCategoryId) } },
      }),
    };

    return await this.prisma.$transaction(async (tx) => {
      const updatedProperty = await tx.property.update({
        where: { id: propertyId },
        data: updateData,
        include: {
          propertyImage: true,
          propertyCategory: true,
          tenant: {
            select: {
              name: true,
              phone: true,
              bankName: true,
              bankNumber: true,
            },
          },
        },
      });

      if (files && files.length > 0 && imageResults.length > 0) {
        if (currentProperty.propertyImage.length > 0) {
          await tx.propertyImage.deleteMany({ where: { propertyId } });
        }

        await Promise.all(
          imageResults
            .filter((res) => res.secure_url)
            .map((res) =>
              tx.propertyImage.create({
                data: {
                  imageUrl: res.secure_url!,
                  propertyId: updatedProperty.id,
                  isDeleted: false,
                },
              })
            )
        );
      }

      const finalProperty = await tx.property.findUnique({
        where: { id: propertyId },
        include: {
          propertyImage: true,
          propertyCategory: true,
          tenant: {
            select: {
              name: true,
              phone: true,
              bankName: true,
              bankNumber: true,
            },
          },
          room: {
            where: { isDeleted: false },
            include: { roomImage: true, roomFacility: true },
          },
          propertyFacility: { where: { isDeleted: false } },
          review: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      return { message: "Update property success", data: finalProperty };
    });
  };

  // ================= GET PROPERTIES BY QUERY (PUBLIC) =================
  getPropertiesByQuery = async (query: GetPropertiesQuery) => {
    try {
      const {
        take,
        page,
        sortBy,
        sortOrder,
        search,
        guest,
        title,
        startDate,
        endDate,
        name,
        price,
      } = query;

      const roomConditions: Prisma.RoomWhereInput = {
        stock: { gt: 0 },
        ...(guest ? { guest: { gte: guest } } : {}),
        ...(price ? { price: { lte: price } } : {}),
      };

      if (startDate && endDate) {
        roomConditions.roomNonAvailability = {
          none: {
            AND: [
              {
                startDate: { lte: endDate },
                endDate: { gte: startDate },
              },
            ],
          },
        };
      }

      const whereClause: Prisma.PropertyWhereInput = {
        isDeleted: false,
        status: "PUBLISHED",
        room: {
          some: roomConditions,
        },
      };

      if (name) {
        whereClause.propertyCategory = {
          name: { equals: name, mode: "insensitive" },
        };
      }

      if (title) {
        whereClause.title = { contains: title, mode: "insensitive" };
      }
      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ];
      }

      const propertiesByQuery = await this.prisma.property.findMany({
        where: whereClause,
        skip: Math.max(0, (page - 1) * take),
        take: take,
        orderBy: sortBy
          ? { [sortBy]: sortOrder || "asc" }
          : { createdAt: "desc" },
        include: {
          propertyImage: {
            select: { imageUrl: true },
            where: { isDeleted: false },
          },
          review: {
            select: { rating: true },
          },
          tenant: {
            select: { name: true, imageUrl: true },
          },
          room: {
            where: { isDeleted: false },
            include: {
              roomImage: {
                select: { imageUrl: true },
                where: { isDeleted: false },
              },
              roomFacility: {
                where: { isDeleted: false },
              },
            },
          },
          propertyCategory: true,
          propertyFacility: {
            where: { isDeleted: false },
          },
        },
      });

      const count = await this.prisma.property.count({ where: whereClause });

      return {
        data: propertiesByQuery,
        meta: {
          page,
          take,
          total: count,
          totalPages: Math.ceil(count / take),
        },
        ...(process.env.NODE_ENV !== "production" ? { whereClause } : {}),
      };
    } catch (error) {
      throw error;
    }
  };

  // ================= GET TENANT PROPERTIES =================
  getTenantProperties = async (query: any, tenantId: number) => {
    const { page = 1, take = 10, search } = query;
    const skip = (page - 1) * take;

    try {
      const whereClause: any = {
        tenantId,
        isDeleted: false,
      };

      if (search) {
        whereClause.title = { contains: search, mode: "insensitive" };
      }

      const [properties, totalCount] = await Promise.all([
        this.prisma.property.findMany({
          where: whereClause,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            propertyImage: { where: { isDeleted: false } },
            room: { where: { isDeleted: false } },
          },
        }),
        this.prisma.property.count({ where: whereClause }),
      ]);

      return {
        data: properties,
        meta: { totalCount, page, take },
      };
    } catch (error) {
      console.error("Service getTenantProperties error:", error);
      throw error;
    }
  };

  // ================= GET PROPERTY DETAIL (TENANT) =================
  getPropertyTenant = async (id: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id, isDeleted: false },
      include: {
        tenant: true,
        room: { include: { roomImage: true, roomFacility: true } },
        propertyImage: true,
        propertyFacility: true,
        review: true,
        propertyCategory: true,
      },
    });

    if (!property) throw new ApiError("Invalid Property id", 404);

    return property;
  };

  // ================= DELETE PROPERTY =================
  deleteProperty = async (id: number, userId: number) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new ApiError("User not found", 404);
    if (user.role !== Role.TENANT) {
      throw new ApiError(
        "User doesn't have permission to delete property",
        403
      );
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { userId: user.id, isDeleted: false },
    });
    if (!tenant) throw new ApiError("Tenant not found", 404);

    const property = await this.prisma.property.findFirst({
      where: { id, isDeleted: false },
    });
    if (!property) throw new ApiError("Property not found", 404);
    if (property.tenantId !== tenant.id) {
      throw new ApiError("Property doesn't belong to the tenant", 403);
    }

    const currentDate = new Date();

    const deletedProperty = await this.prisma.$transaction(async (tx) => {
      await tx.roomFacility.updateMany({
        where: { room: { propertyId: id } },
        data: { isDeleted: true, updatedAt: currentDate },
      });
      await tx.roomImage.updateMany({
        where: { room: { propertyId: id } },
        data: { isDeleted: true, updatedAt: currentDate },
      });
      await tx.roomNonAvailability.updateMany({
        where: { room: { propertyId: id } },
        data: { isDeleted: true, updatedAt: currentDate },
      });
      await tx.peakSeasonRate.updateMany({
        where: { room: { propertyId: id } },
        data: { isDeleted: true, updatedAt: currentDate },
      });
      await tx.room.updateMany({
        where: { propertyId: id },
        data: { isDeleted: true, updatedAt: currentDate },
      });
      await tx.propertyFacility.updateMany({
        where: { propertyId: id },
        data: { isDeleted: true, updatedAt: currentDate },
      });
      await tx.propertyImage.updateMany({
        where: { propertyId: id },
        data: { isDeleted: true, updatedAt: currentDate },
      });

      const deleted = await tx.property.update({
        where: { id },
        data: { isDeleted: true, updatedAt: currentDate },
        include: {
          propertyImage: true,
          propertyCategory: true,
          room: true,
        },
      });

      return deleted;
    });

    return { message: "Property successfully deleted", data: deletedProperty };
  };

  // ================= RESTORE PROPERTY =================
  restoreProperty = async (id: number, userId: number) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new ApiError("User not found", 404);
    if (user.role !== Role.TENANT) {
      throw new ApiError(
        "User doesn't have permission to restore property",
        403
      );
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { userId: user.id, isDeleted: false },
    });
    if (!tenant) throw new ApiError("Tenant not found", 404);

    const property = await this.prisma.property.findFirst({
      where: { id, isDeleted: true },
    });
    if (!property) throw new ApiError("Deleted property not found", 404);
    if (property.tenantId !== tenant.id) {
      throw new ApiError("Property doesn't belong to the tenant", 403);
    }

    const currentDate = new Date();

    const restoredProperty = await this.prisma.$transaction(async (tx) => {
      await tx.roomFacility.updateMany({
        where: { room: { propertyId: id } },
        data: { isDeleted: false, updatedAt: currentDate },
      });
      await tx.roomImage.updateMany({
        where: { room: { propertyId: id } },
        data: { isDeleted: false, updatedAt: currentDate },
      });
      await tx.roomNonAvailability.updateMany({
        where: { room: { propertyId: id } },
        data: { isDeleted: false, updatedAt: currentDate },
      });
      await tx.peakSeasonRate.updateMany({
        where: { room: { propertyId: id } },
        data: { isDeleted: false, updatedAt: currentDate },
      });
      await tx.room.updateMany({
        where: { propertyId: id },
        data: { isDeleted: false, updatedAt: currentDate },
      });
      await tx.propertyFacility.updateMany({
        where: { propertyId: id },
        data: { isDeleted: false, updatedAt: currentDate },
      });
      await tx.propertyImage.updateMany({
        where: { propertyId: id },
        data: { isDeleted: false, updatedAt: currentDate },
      });

      const restored = await tx.property.update({
        where: { id },
        data: { isDeleted: false, updatedAt: currentDate },
        include: {
          propertyImage: true,
          propertyCategory: true,
          room: true,
        },
      });

      return restored;
    });

    return {
      message: "Property successfully restored",
      data: restoredProperty,
    };
  };

  // ================= GET PROPERTIES ADVANCED (PUBLIC) =================
  getPropertiesAdvanced = async (query: GetPropertyQuery) => {
    const {
      take = 8,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
      location,
      category,
      search,
      startDate,
      endDate,
      guest,
      priceMin,
      priceMax,
    } = query;

    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new ApiError(
        "Both startDate and endDate are required for filtering",
        400
      );
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ApiError("Invalid date format for startDate or endDate", 400);
      }
      if (start > end) {
        throw new ApiError("startDate cannot be after endDate", 400);
      }
    }

    const whereClause: Prisma.PropertyWhereInput = {
      isDeleted: false,
      status: "PUBLISHED",
      ...(location && {
        location: { contains: location, mode: "insensitive" },
      }),
      ...(category && {
        propertyCategory: {
          name: { contains: category, mode: "insensitive" },
        },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(guest && {
        room: {
          some: { guest: { gte: guest }, isDeleted: false },
        },
      }),
      ...(priceMin && {
        room: {
          some: { price: { gte: priceMin }, isDeleted: false },
        },
      }),
      ...(priceMax && {
        room: {
          some: { price: { lte: priceMax }, isDeleted: false },
        },
      }),
      ...(startDate &&
        endDate && {
          room: {
            some: {
              isDeleted: false,
              ...(guest && { guest: { gte: guest } }),

              roomNonAvailability: {
                none: {
                  isDeleted: false,
                  startDate: { lte: new Date(endDate) },
                  endDate: { gte: new Date(startDate) },
                },
              },
            },
          },
        }),
    };

    const allowedSortByFields: Array<
      keyof Prisma.PropertyOrderByWithRelationInput
    > = ["createdAt", "updatedAt", "title", "location"];

    const sortField = allowedSortByFields.includes(
      sortBy as keyof Prisma.PropertyOrderByWithRelationInput
    )
      ? sortBy
      : "createdAt";

    const orderByClause: Prisma.PropertyOrderByWithRelationInput = {
      [sortField]: sortOrder,
    };

    const skip = (page - 1) * take;

    const [properties, totalCount] = await Promise.all([
      this.prisma.property.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: orderByClause,
        include: {
          propertyCategory: true,
          propertyImage: { where: { isDeleted: false } },
          propertyFacility: { where: { isDeleted: false } },
          tenant: true,
          room: {
            where: { isDeleted: false },
            include: {
              roomImage: { where: { isDeleted: false } },
              roomFacility: { where: { isDeleted: false } },
              peakSeasonRate: { where: { isDeleted: false } },
              roomNonAvailability: { where: { isDeleted: false } },
            },
          },
        },
      }),
      this.prisma.property.count({ where: whereClause }),
    ]);

    return {
      data: properties,
      meta: {
        totalCount,
        page,
        take,
      },
    };
  };

  // ================= GET PROPERTY DETAIL BY SLUG (PUBLIC) =================
  getPropertyBySlug = async (slug: string) => {
    try {
      const property = await this.prisma.property.findFirst({
        where: {
          slug,
          isDeleted: false,
        },
        include: {
          tenant: true,
          room: {
            include: {
              roomImage: true,
              roomFacility: true,
              peakSeasonRate: {
                where: { isDeleted: false },
              },
              roomNonAvailability: {
                where: { isDeleted: false },
              },
            },
          },
          propertyImage: true,
          propertyFacility: true,
          review: {
            orderBy: { createdAt: "desc" },
          },
          propertyCategory: true,
        },
      });

      if (!property) {
        throw new ApiError("Invalid Property Slug", 404);
      }

      return property;
    } catch (error) {
      throw error;
    }
  };

  // ================= GET TENANT BY USER ID =================
  getTenantByUserId = async (userId: number) => {
    return this.prisma.tenant.findFirst({
      where: { userId, isDeleted: false },
    });
  };
}
