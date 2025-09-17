import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { AuthService } from "./auth.service";
import { ResetPasswordDTO } from "./dto/reset-password.dto";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  registerTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.registerTenant(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyEmailAndSetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authUser = req.user;
      if (!authUser || !authUser.id) {
        throw new ApiError("Unauthorized: User not found in token", 401);
      }

      const result = await this.authService.verifyEmailAndSetPassword(
        req.body,
        authUser.id
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  googleAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.googleAuth(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.forgotPassword(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ambil token dari query parameter
      const resetPasswordToken = req.query.token as string;

      const result = await this.authService.resetPassword(
        req.body as ResetPasswordDTO,
        resetPasswordToken
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  resendEmailVerif = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.authService.resendEmailVerif(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const result = await this.authService.verifyEmail(user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ApiError("Unauthorized", 401);
      const result = await this.authService.changePassword(
        req.user.id,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
