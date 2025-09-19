// src/services/account/account.service.ts
import jwt from "jsonwebtoken";
import { env } from "../../config";
import { cloudinaryRemove, cloudinaryUpload } from "../../lib/cloudinary";
import { ApiError } from "../../utils/api-error";
import { PasswordService } from "../auth/password.service";
import { TokenService } from "../auth/token.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

interface ChangePasswordBody {
  password: string;
  newPassword: string;
}

interface UpdateProfileBody {
  name: string;
}

interface UpdateTenantBody {
  name?: string;
  phoneNumber?: string;
  bankName?: string;
  bankNumber?: string;
}

interface VerifyInput {
  token: string;
  password: string;
}

export class AccountService {
  private prisma: PrismaService;
  private mailService: MailService;
  private passwordService: PasswordService;
  private tokenService: TokenService;

  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
    this.passwordService = new PasswordService();
    this.tokenService = new TokenService();
  }

  changeEmail = async (userId: number, newEmail: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail))
      throw new ApiError("Invalid email format", 400);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new ApiError("User not found", 404);

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: { equals: newEmail, mode: "insensitive" },
        isDeleted: false,
      },
    });
    if (existingUser) throw new ApiError("Email already in use", 400);

    const verificationToken = jwt.sign(
      { email: newEmail, createdAt: new Date().toISOString() },
      env().JWT_SECRET,
      { expiresIn: "1h" }
    );
    const verificationLink = `${process.env.FRONTEND_URL}/dashboard/account/verify-email?token=${verificationToken}`;
    const fullName = `${user.firstName} ${user.lastName}`;

    try {
      await this.mailService.sendEmail(
        newEmail,
        "Verify Your Email",
        "verif-new-email",
        {
          userName: fullName,
          verificationLink,
          currentYear: new Date().getFullYear(),
          logoUrl:
            "https://res.cloudinary.com/andikalp/image/upload/v1738209868/qdx0l3jzw4fsqoag71dl.png",
          appName: "Homigo",
          appAddress: "Your App Address",
          expiryTime: "1 hour",
        }
      );
      console.log(`Verification email sent to ${newEmail}`);
    } catch (err: any) {
      console.error("Failed to send verification email:", err);
      throw new ApiError("Failed to send verification email", 500);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationToken, verificationSentAt: new Date() },
    });

    return { message: "Verification email sent successfully", expiresIn: "1h" };
  };

  changePassword = async (userId: number, body: ChangePasswordBody) => {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password)
      throw new ApiError("User not found or no password set", 404);

    const match = await this.passwordService.comparePassword(
      body.password,
      user.password
    );
    if (!match) throw new ApiError("Current password is incorrect", 400);

    const hashed = await this.passwordService.hashPassword(body.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: "Change password success" };
  };

  getProfile = async (userId: number) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        imageUrl: true,
        role: true,
        isVerified: true,
      },
    });
    if (!user) throw new ApiError("User not found", 404);
    return user;
  };

  getTenant = async (userId: number) => {
    const tenant = await this.prisma.tenant.findFirst({ where: { userId } });
    if (!tenant) throw new ApiError("Tenant not found", 404);
    return tenant;
  };

  updateProfile = async (
    userId: number,
    body: UpdateProfileBody,
    imageFile?: Express.Multer.File
  ) => {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new ApiError("User not found", 404);

    let imageUrl: string | undefined;
    if (imageFile) {
      if (user.imageUrl) await cloudinaryRemove(user.imageUrl);
      const uploadResult = await cloudinaryUpload(imageFile);
      imageUrl = uploadResult.secure_url;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { ...body, ...(imageUrl && { imageUrl }) },
    });

    return updatedUser;
  };

  updateTenantProfile = async (
    userId: number,
    body: UpdateTenantBody,
    imageFile?: Express.Multer.File
  ) => {
    const tenant = await this.prisma.tenant.findFirst({
      where: { userId, isDeleted: false },
    });
    if (!tenant) throw new ApiError("Tenant not found", 404);

    let imageUrl: string | undefined;
    if (imageFile) {
      if (tenant.imageUrl) await cloudinaryRemove(tenant.imageUrl);
      const uploadResult = await cloudinaryUpload(imageFile);
      imageUrl = uploadResult.secure_url;
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { ...body, ...(imageUrl && { imageUrl }) },
    });

    return updatedTenant;
  };

  verifyChangeEmail = async ({ token, password }: VerifyInput) => {
    try {
      const decoded = jwt.verify(token, env().JWT_SECRET) as {
        email: string;
        createdAt: string;
      };
      const tokenCreationTime = new Date(decoded.createdAt).getTime();
      const currentTime = new Date().getTime();
      if (currentTime - tokenCreationTime > 60 * 60 * 1000)
        throw new ApiError("Verification link expired", 400);

      const user = await this.prisma.user.findFirst({
        where: { verificationToken: token },
      });
      if (!user) throw new ApiError("Invalid verification token", 400);

      const hashedPassword = password
        ? await this.passwordService.hashPassword(password)
        : undefined;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: decoded.email,
          password: hashedPassword,
          verificationToken: null,
          verificationSentAt: null,
        },
      });

      return { message: "Email verified successfully", email: decoded.email };
    } catch (error: any) {
      if (error.name === "JsonWebTokenError")
        throw new ApiError("Invalid verification token", 400);
      throw error;
    }
  };
}
