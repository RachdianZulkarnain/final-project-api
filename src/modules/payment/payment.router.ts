import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/upload.middleware";
import { PaymentController } from "./payment.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import { UpdatePaymentDTO } from "./dto/update-payments.dto";

export class PaymentRouter {
  private router: Router;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;
  private paymentController: PaymentController;

  constructor() {
    this.router = Router();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.paymentController = new PaymentController();
    this.initializeRoutes();
  }

  private initializeRoutes = (): void => {
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.paymentController.createPayment
    );
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["USER"]),
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "paymentProof", maxCount: 1 }]),
      this.uploaderMiddleware.fileFilter([
        "image/png",
        "image/jpeg",
        "image/heic",
        "image/avif",
      ]),
      this.paymentController.uploadPayment
    );
    this.router.patch(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["TENANT"]),
      validateBody(UpdatePaymentDTO),
      this.paymentController.updatePayment
    );
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["TENANT"]),
      this.paymentController.getPayments
    );
  };

  getRouter = () => {
    return this.router;
  };
}
