import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { AuthService } from "./auth.service";
import { LoginDTO } from "./dto/login.dto";
import { RegisterDTO } from "./dto/register.dto";
import { VerificationDTO } from "./dto/verification.dto";
import { GoogleAuthDTO } from "./dto/googleAuth.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDTO } from "./dto/reset-password.dto";
import { ChangePasswordDTO } from "./dto/change-password.dto";
import { ApiError } from "../../utils/api-error";

interface AuthenticatedUser {
  id: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

@injectable()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as LoginDTO;
      const result = await this.authService.login(body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as RegisterDTO;
      const result = await this.authService.register(body);
      res.status(200).send(result);
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
      const authUser = res.locals.user; // Ambil user dari JwtMiddleware
      if (!authUser || !authUser.id) {
        throw new ApiError("Unauthorized: User not found in token", 401);
      }

      const body = req.body as VerificationDTO;
      const result = await this.authService.verifyEmailAndSetPassword(
        body,
        authUser.id
      );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  googleAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as GoogleAuthDTO;
      const result = await this.authService.googleAuth(body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as ForgotPasswordDto;
      const result = await this.authService.forgotPassword(body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as ResetPasswordDTO;
      const resetPasswordToken = req.query.token as string;
      const result = await this.authService.resetPassword(
        body,
        resetPasswordToken
      );
      res.status(200).send(result);
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
      const body = req.body as ForgotPasswordDto;
      const result = await this.authService.resendEmailVerif(body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUserId = req.user!.id;
      const result = await this.authService.verifyEmail(authUserId);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUserId = req.user!.id;
      const body = req.body as ChangePasswordDTO;
      const result = await this.authService.changePassword(authUserId, body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
