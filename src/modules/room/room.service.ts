// room.service.ts
import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { Prisma } from "../../generated/prisma";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

interface RoomFacility {
  id?: number;
  title: string;
  description: string;
  isDeleted?: boolean;
}

interface CreateRoomBody {
  type: "Deluxe" | "Standard" | "Suite";
  stock: number;
  name?: string;
  price: number;
  guest: number;
  propertyId: number;
  facilities: RoomFacility[];
}

interface UpdateRoomBody {
  type?: "Deluxe" | "Standard" | "Suite";
  name?: string;
  stock?: number;
  price?: number;
  guest?: number;
  facilities?: RoomFacility[];
}

interface PaginationQueryParams {
  take: number;
  page: number;
  sortBy: string;
  sortOrder?: "asc" | "desc";
}

export interface GetRoomsQuery extends PaginationQueryParams {
  search?: string;
}

@injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  // ================= CREATE ROOM =================
  createRoom = async (
    body: CreateRoomBody,
    file: Express.Multer.File,
    tenantId: number
  ) => {
    const { type, name, stock, price, guest, propertyId, facilities } = body;

    const stockRoom = Number(stock);
    const priceRoom = Number(price);
    const guestRoom = Number(guest);

    const property = await this.prisma.property.findFirst({
      where: { id: Number(propertyId), tenantId },
    });

    if (!property) {
      throw new ApiError("Property not found", 404);
    }

    if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
      throw new ApiError("At least one facility must be provided", 400);
    }

    let secureUrl: string | undefined;
    if (file) {
      const uploadResult = await this.cloudinaryService.upload(file, "rooms");
      secureUrl = uploadResult.secure_url;
    }

    return await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const newRoom = await tx.room.create({
          data: {
            type,
            name,
            stock: stockRoom,
            price: priceRoom,
            guest: guestRoom,
            property: { connect: { id: property.id } },
          },
        });

        if (file && secureUrl) {
          await tx.roomImage.create({
            data: { imageUrl: secureUrl, roomId: newRoom.id },
          });
        }

        const facilityPromises = facilities.map((facility) =>
          tx.roomFacility.create({
            data: {
              title: facility.title,
              description: facility.description,
              roomId: newRoom.id,
            },
          })
        );
        await Promise.all(facilityPromises);

        const roomWithRelations = await tx.room.findUnique({
          where: { id: newRoom.id },
          include: { roomFacility: true, roomImage: true },
        });

        return {
          message: "Create Room success",
          data: roomWithRelations,
        };
      }
    );
  };

  // ================= UPDATE ROOM =================
  updateRoom = async (
    id: number,
    body: Partial<UpdateRoomBody>,
    file: Express.Multer.File | undefined,
    tenantId: number
  ) => {
    const existingRoom = await this.prisma.room.findUnique({
      where: { id },
      include: {
        property: true,
        roomImage: true,
        roomFacility: { where: { isDeleted: false } },
      },
    });

    if (!existingRoom) throw new ApiError("Room not found", 404);
    if (existingRoom.property.tenantId !== tenantId) {
      throw new ApiError("You don't have permission to update this room", 403);
    }

    let secureUrl: string | undefined;
    if (file) {
      const uploadResult = await this.cloudinaryService.upload(file, "rooms");
      secureUrl = uploadResult.secure_url;
    }

    if (body.stock !== undefined) body.stock = Number(body.stock);
    if (body.price !== undefined) body.price = Number(body.price);
    if (body.guest !== undefined) body.guest = Number(body.guest);

    const { facilities, ...roomData } = body;

    const updatedData: Prisma.RoomUpdateInput = { ...roomData };

    return await this.prisma.$transaction(async (tx) => {
      const updatedRoom = await tx.room.update({
        where: { id },
        data: updatedData,
      });

      if (file && secureUrl) {
        if (existingRoom.roomImage.length > 0) {
          await tx.roomImage.update({
            where: { id: existingRoom.roomImage[0].id },
            data: { imageUrl: secureUrl },
          });
        } else {
          await tx.roomImage.create({
            data: { imageUrl: secureUrl, roomId: id },
          });
        }
      }

      if (facilities && Array.isArray(facilities)) {
        const existingFacilityIds = new Set(
          existingRoom.roomFacility.map((facility) => facility.id)
        );

        for (const facility of facilities) {
          if (facility.id && existingFacilityIds.has(facility.id)) {
            if (facility.isDeleted) {
              await tx.roomFacility.update({
                where: { id: facility.id },
                data: { isDeleted: true },
              });
            } else {
              await tx.roomFacility.update({
                where: { id: facility.id },
                data: {
                  title: facility.title,
                  description: facility.description,
                },
              });
            }
            existingFacilityIds.delete(facility.id);
          } else if (!facility.id) {
            await tx.roomFacility.create({
              data: {
                title: facility.title,
                description: facility.description,
                roomId: id,
              },
            });
          }
        }
      }

      const roomWithRelations = await tx.room.findUnique({
        where: { id: updatedRoom.id },
        include: {
          roomFacility: { where: { isDeleted: false } },
          roomImage: true,
        },
      });

      return { message: "Update room success", data: roomWithRelations };
    });
  };

  // ================= GET ROOMS (GENERAL) =================
  getRooms = async (query: GetRoomsQuery) => {
    const { take, page, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.RoomWhereInput = { isDeleted: false };

    if (search) {
      const allowedTypes: Array<"Deluxe" | "Standard" | "Suite"> = [
        "Deluxe",
        "Standard",
        "Suite",
      ];
      if (allowedTypes.includes(search as any)) {
        whereClause.type = { equals: search as any };
      } else {
        whereClause.name = { contains: search, mode: "insensitive" };
      }
    }

    const rooms = await this.prisma.room.findMany({
      where: whereClause,
      skip: (page - 1) * take,
      take,
      orderBy: { [sortBy]: sortOrder || "asc" },
      include: {
        roomFacility: true,
        roomImage: true,
        roomNonAvailability: true,
        peakSeasonRate: true,
        property: true,
      },
    });

    const count = await this.prisma.room.count({ where: whereClause });

    return { data: rooms, meta: { page, take, total: count } };
  };

  // ================= GET ROOMS (TENANT) =================
  getRoomsTenant = async (query: GetRoomsQuery, userId: number) => {
    const { take, page, sortBy, sortOrder, search } = query;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError("User not found", 404);
    if (user.role !== "TENANT") {
      throw new ApiError("User doesn't have access", 403);
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { userId: user.id, isDeleted: false },
    });
    if (!tenant) throw new ApiError("Tenant not found", 404);

    const whereClause: Prisma.RoomWhereInput = {
      isDeleted: false,
      property: { tenantId: tenant.id },
    };

    if (search) {
      const allowedTypes: Array<"Deluxe" | "Standard" | "Suite"> = [
        "Deluxe",
        "Standard",
        "Suite",
      ];
      if (allowedTypes.includes(search as any)) {
        whereClause.type = { equals: search as any };
      } else {
        whereClause.name = { contains: search, mode: "insensitive" };
      }
    }

    const rooms = await this.prisma.room.findMany({
      where: whereClause,
      skip: (page - 1) * take,
      take,
      orderBy: { [sortBy]: sortOrder || "asc" },
      include: {
        roomFacility: true,
        roomImage: true,
        roomNonAvailability: true,
        peakSeasonRate: true,
        property: true,
      },
    });

    const count = await this.prisma.room.count({ where: whereClause });

    return { data: rooms, meta: { page, take, total: count } };
  };

  // ================= GET ROOM BY ID =================
  getRoom = async (id: number) => {
    const room = await this.prisma.room.findFirst({
      where: { id, isDeleted: false },
      include: {
        roomFacility: true,
        roomImage: true,
        roomNonAvailability: true,
        peakSeasonRate: true,
        property: true,
      },
    });

    if (!room) {
      throw new ApiError("Invalid room id", 404);
    }
    return room;
  };

  // ================= DELETE ROOM =================
  deleteRoom = async (id: number, userId: number) => {
    const room = await this.prisma.room.findFirst({
      where: { id, NOT: { isDeleted: true } },
      include: { property: { include: { tenant: true } } },
    });

    if (!room) throw new ApiError("Room not found or already deleted", 404);
    if (!room.property || room.property.tenant.userId !== userId) {
      throw new ApiError("You don't have permission to delete this room", 403);
    }

    return await this.prisma.$transaction(async (tx) => {
      const currentDate = new Date();

      await Promise.all([
        tx.roomFacility.updateMany({
          where: { roomId: id },
          data: { isDeleted: true, updatedAt: currentDate },
        }),
        tx.roomImage.updateMany({
          where: { roomId: id },
          data: { isDeleted: true, updatedAt: currentDate },
        }),
        tx.roomNonAvailability.updateMany({
          where: { roomId: id },
          data: { isDeleted: true, updatedAt: currentDate },
        }),
        tx.peakSeasonRate.updateMany({
          where: { roomId: id },
          data: { isDeleted: true, updatedAt: currentDate },
        }),
      ]);

      const deletedRoom = await tx.room.update({
        where: { id },
        data: { isDeleted: true, updatedAt: currentDate },
        include: { roomFacility: true, roomImage: true, peakSeasonRate: true },
      });

      return { message: "Room successfully deleted", data: deletedRoom };
    });
  };

  // ================= RESTORE ROOM =================
  restoreRoom = async (id: number, userId: number) => {
    const room = await this.prisma.room.findFirst({
      where: { id, isDeleted: true },
      include: { property: { include: { tenant: true } } },
    });

    if (!room) throw new ApiError("Deleted room not found", 404);
    if (!room.property || room.property.tenant.userId !== userId) {
      throw new ApiError("You don't have permission to restore this room", 403);
    }

    return await this.prisma.$transaction(async (tx) => {
      const currentDate = new Date();

      await Promise.all([
        tx.roomFacility.updateMany({
          where: { roomId: id },
          data: { isDeleted: false, updatedAt: currentDate },
        }),
        tx.roomImage.updateMany({
          where: { roomId: id },
          data: { isDeleted: false, updatedAt: currentDate },
        }),
        tx.roomNonAvailability.updateMany({
          where: { roomId: id },
          data: { isDeleted: false, updatedAt: currentDate },
        }),
        tx.peakSeasonRate.updateMany({
          where: { roomId: id },
          data: { isDeleted: false, updatedAt: currentDate },
        }),
      ]);

      const restoredRoom = await tx.room.update({
        where: { id },
        data: { isDeleted: false, updatedAt: currentDate },
        include: { roomFacility: true, roomImage: true, peakSeasonRate: true },
      });

      return { message: "Room successfully restored", data: restoredRoom };
    });
  };
}
