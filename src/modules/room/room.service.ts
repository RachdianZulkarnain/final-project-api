import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { Prisma } from "../../generated/prisma";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

interface RoomFacility {
  title: string;
  description: string;
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
}
