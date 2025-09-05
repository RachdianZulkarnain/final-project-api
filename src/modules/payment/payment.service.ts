import { injectable } from "tsyringe";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentQueue } from "./payment.queue";
import { ApiError } from "../../utils/api-error";
import { UpdatePaymentDTO } from "./dto/update-payments.dto";
import { GetTenantPaymentsDto } from "./dto/get-payments.dto";
import { Prisma } from "../../generated/prisma";

@injectable()
export class PaymentService {
  private prisma: PrismaService;
  private mailService: MailService;
  private cloudinaryService: CloudinaryService;
  private paymentQueue: PaymentQueue;

  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
    this.paymentQueue = new PaymentQueue();
    this.cloudinaryService = new CloudinaryService();
  }

  createPayment = async (body: CreatePaymentDto, userId: number) => {
    const {
      roomId,
      totalPrice,
      duration,
      paymentMethode = "MANUAL",
      paymentProof,
      invoiceUrl,
      expiredAt,
    } = body;

    // Fetch the room
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        isDeleted: false, // optional check
      },
    });

    if (!room) {
      throw new Error(`Room with ID ${roomId} does not exist.`);
    }

    const expiration = expiredAt
      ? new Date(expiredAt)
      : new Date(Date.now() + 15 * 60 * 1000); // default: +15 min

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId,
          roomId,
          totalPrice,
          duration,
          paymentMethode,
          status: "WAITING_FOR_PAYMENT",
          paymentProof,
          invoiceUrl,
          expiredAt: expiration,
        },
        include: {
          user: true,
          room: {
            include: {
              property: true,
            },
          },
        },
      });

      await this.paymentQueue.addNewPaymentQueue(result.uuid);

      await this.mailService.sendEmail(
        result.user.email,
        "Upload your payment proof",
        "upload-payment-proof",
        {
          name: `${result.user.firstName} ${result.user.lastName}`,
          uuid: result.uuid,
          expireAt: result.expiredAt,
          year: new Date().getFullYear(),
        }
      );

      return payment;
    });

    return result;
  };

  uploadPaymentProof = async (
    uuid: string,
    paymentProof: Express.Multer.File,
    userId: number
  ) => {
    const payment = await this.prisma.payment.findFirst({
      where: { uuid },
    });

    if (!payment) {
      throw new ApiError("Payment not found", 404);
    }

    if (payment.userId !== userId) {
      throw new ApiError("Unauthorized", 403);
    }

    const { secure_url } = await this.cloudinaryService.upload(paymentProof);

    await this.prisma.payment.update({
      where: { uuid },
      data: {
        paymentProof: secure_url,
        status: "WAITING_FOR_PAYMENT_CONFIRMATION",
      },
    });

    return { message: "Payment proof uploaded successfully" };
  };

  updatePayment = async (body: UpdatePaymentDTO) => {
    // 1) Find payment + user for email data
    const payment = await this.prisma.payment.findFirst({
      where: { uuid: body.uuid },
      include: { user: true }, // include user for email
    });

    if (!payment) {
      throw new ApiError("Payment not found", 404);
    }

    if (payment.status !== "WAITING_FOR_PAYMENT_CONFIRMATION") {
      throw new ApiError(
        "Payment Status must be WAITING_FOR_PAYMENT_CONFIRMATION",
        400
      );
    }

    // 2) Transactional updates
    await this.prisma.$transaction(async (tx) => {
      // Update status
      await tx.payment.update({
        where: { uuid: body.uuid },
        data: {
          status: body.type === "ACCEPT" ? "PAID" : "REJECTED",
          updatedAt: new Date(),
        },
      });

      // If rejected, return room stock (assuming 1 reserved unit per payment)
      if (body.type === "REJECT") {
        await tx.room.update({
          where: { id: payment.roomId },
          data: { stock: { increment: 1 } },
        });
      }
    });

    // 3) Notify user via email
    const template =
      body.type === "ACCEPT" ? "payment-accepted" : "payment-rejected";
    const subject =
      body.type === "ACCEPT"
        ? "Your payment has been accepted!"
        : "Your payment has been rejected";

    await this.mailService.sendEmail(payment.user.email, subject, template, {
      name:
        (payment.user.firstName
          ? `${payment.user.firstName} ${payment.user.lastName ?? ""}`.trim()
          : payment.user.email) || "Customer",
      paymentCode: payment.uuid,
      totalPrice: payment.totalPrice,
      duration: payment.duration,
      year: new Date().getFullYear(),
    });

    return {
      message: `${
        body.type === "ACCEPT" ? "Accept" : "Reject"
      } payment success`,
    };
  };

  getTenantPayments = async (tenantId: number, query: GetTenantPaymentsDto) => {
    const { page, take, sortBy, sortOrder, q, status } = query;

    const where: Prisma.PaymentWhereInput = {
      room: {
        isDeleted: false,
        property: {
          isDeleted: false,
          tenantId,
          tenant: { isDeleted: false },
        },
      },
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { uuid: { contains: q, mode: "insensitive" } },
              { user: { firstName: { contains: q, mode: "insensitive" } } },
              { user: { lastName: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              {
                room: {
                  property: { title: { contains: q, mode: "insensitive" } },
                },
              },
              { room: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          room: {
            select: {
              id: true,
              name: true,
              type: true,
              property: { select: { id: true, title: true, slug: true } },
            },
          },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder || "desc" },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: { page, take, total },
    };
  };
}
