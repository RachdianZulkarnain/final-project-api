import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { AccountService } from "./account.service";

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  /** GET PROFILE */
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(res.locals.user?.id);
      if (!userId) throw new ApiError("Unauthorized: User not found", 401);

      const result = await this.accountService.getProfile(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /** GET TENANT */
  getTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(res.locals.user?.id);
      if (!userId) throw new ApiError("Unauthorized: User not found", 401);

      const result = await this.accountService.getTenant(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /** UPDATE PROFILE */
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(res.locals.user?.id);
      if (!userId) throw new ApiError("Unauthorized: User not found", 401);

      const result = await this.accountService.updateProfile(
        userId,
        req.body,
        req.file
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /** UPDATE TENANT PROFILE */
  updateTenantProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = Number(res.locals.user?.id);
      if (!userId) throw new ApiError("Unauthorized: User not found", 401);

      const result = await this.accountService.updateTenantProfile(
        userId,
        req.body,
        req.file
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /** CHANGE PASSWORD */
  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(res.locals.user?.id);
      if (!userId) throw new ApiError("Unauthorized: User not found", 401);

      const { oldPassword, newPassword } = req.body;
      const result = await this.accountService.changePassword(userId, {
        password: oldPassword,
        newPassword,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /** CHANGE EMAIL */
  changeEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(res.locals.user?.id);
      if (!userId) throw new ApiError("Unauthorized: User not found", 401);

      const { email } = req.body;
      if (!email) throw new ApiError("Email is required", 400);

      const result = await this.accountService.changeEmail(userId, email);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /** VERIFY CHANGE EMAIL */
  verifyChangeEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { token, password } = req.body;
      if (!token) throw new ApiError("Token is required", 400);
      if (!password) throw new ApiError("Password is required", 400);

      const result = await this.accountService.verifyChangeEmail({
        token,
        password,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
