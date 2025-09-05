import { Request, Response } from "express";
import { PaymentService } from "./payment.service";
import { ApiError } from "../../utils/api-error";
import { GetTenantPaymentsDto } from "./dto/get-payments.dto";
import { plainToInstance } from "class-transformer";

export class PaymentController {
  private paymentService = new PaymentService();

  createPayment = async (req: Request, res: Response) => {
    const userId = res.locals.user.id;
    const result = await this.paymentService.createPayment(req.body, userId);
    res.status(200).send(result);
  };

  uploadPayment = async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const paymentProof = files?.paymentProof?.[0];
    if (!paymentProof) throw new ApiError("Payment proof is required", 400);

    const userId = res.locals.user.id;
    const result = await this.paymentService.uploadPaymentProof(
      req.params.uuid,
      paymentProof,
      userId
    );
    res.status(200).send(result);
  };

  updatePayment = async (req: Request, res: Response) => {
    const result = await this.paymentService.updatePayment(req.body);
    res.status(200).send(result);
  };

  getPayments = async (req: Request, res: Response) => {
    const tenantId = res.locals.user.id;
    if (!tenantId) throw new ApiError("Unauthorized", 401);

    const query = plainToInstance(GetTenantPaymentsDto, req.query);
    const result = await this.paymentService.getTenantPayments(tenantId, query);

    res.status(200).send(result);
  };

  
}
