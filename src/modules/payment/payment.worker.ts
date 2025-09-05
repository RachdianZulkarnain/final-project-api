// src/modules/payments/payment.worker.ts

import { Job, Worker } from 'bullmq';
import { connection } from '../../config/redis';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../../utils/api-error';

export class PaymentWorker {
  private worker: Worker;
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();

    this.worker = new Worker('paymentQueue', this.handlePayment, {
      connection,
    });
  }

  private handlePayment = async (job: Job<{ uuid: string }>) => {
    const { uuid } = job.data;

    const payment = await this.prisma.payment.findFirst({
      where: { uuid },
    });

    if (!payment) {
      throw new ApiError('Invalid payment UUID', 400);
    }

    if (payment.status === "WAITING_FOR_PAYMENT") {
      await this.prisma.$transaction(async (tx) => {
        // Cancel the payment
        await tx.payment.update({
          where: { uuid },
          data: { status: "EXPIRED" },
        });

        // OPTIONAL: If you want to return room stock (like in transaction rollback)
        // You can fetch the room and increase stock if needed
        // Example:
        // await tx.room.update({
        //   where: { id: payment.roomId },
        //   data: {
        //     stock: {
        //       increment: 1, // Only if room stock is being reserved per payment
        //     },
        //   },
        // });
      });
    }
  };
}
