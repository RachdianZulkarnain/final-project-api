import { Queue } from 'bullmq';
import { connection } from '../../config/redis'; // adjust path if needed

export class PaymentQueue {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('paymentQueue', { connection });
  }

  addNewPaymentQueue = async (uuid: string) => {
    return await this.queue.add(
      'newPayment',
      { uuid },
      {
        jobId: uuid, // prevent duplicate jobs
        delay: 5 * 60 * 1000, // delay 5 minutes
        attempts: 5, // retry up to 5 times on failure
        removeOnComplete: true,
        backoff: { type: 'exponential', delay: 1000 },
      }
    );
  };
}
