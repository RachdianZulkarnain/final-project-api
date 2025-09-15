import { OAuth2Client } from "google-auth-library";
import { ApiError } from "../../utils/api-error";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { prismaExclude } from "../prisma/utils";
import { GoogleAuthDTO } from "./dto/googleAuth.dto";
import { LoginDTO } from "./dto/login.dto";
import { VerificationDTO } from "./dto/verification.dto";
import { ResetPasswordDTO } from "./dto/reset-password.dto";
import { RegisterDTO } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ChangePasswordDTO } from "./dto/change-password.dto";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { Role, Provider } from "../../generated/prisma";
import { env } from "../../config";
import { RegisterTenantDTO } from "./dto/RegisterTenant.dto";

export class AuthService {
  private prisma: PrismaService;
  private passwordService: PasswordService;
  private tokenService: TokenService;
  private mailService: MailService;
  private googleClient: OAuth2Client;

  constructor() {
    this.prisma = new PrismaService();
    this.passwordService = new PasswordService();
    this.tokenService = new TokenService();
    this.mailService = new MailService();

    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error("Missing GOOGLE_CLIENT_ID env variable");
    }
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /** LOGIN */
  login = async (body: LoginDTO) => {
    const { email, password } = body;

    const existingUser = await this.prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
    if (!existingUser) throw new ApiError("User not found", 404);
    if (!existingUser.password) throw new ApiError("User is not verified", 400);

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      existingUser.password
    );
    if (!isPasswordValid) throw new ApiError("Incorrect password", 400);

    const accessToken = this.tokenService.generateToken(
      { id: existingUser.id, role: existingUser.role },
      env().JWT_SECRET
    );

    const { password: pw, ...userWithoutPassword } = existingUser;
    return { ...userWithoutPassword, accessToken };
  };

  /** REGISTER USER */
  register = async (body: RegisterDTO) => {
    const { firstName, lastName, email } = body;

    const existingUser = await this.prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
    if (existingUser) throw new ApiError("Email already exists", 400);

    const newUser = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        isVerified: false,
        role: Role.USER,
        provider: Provider.CREDENTIAL,
        resetPasswordTokenUsed: false,
      },
      select: {
        ...prismaExclude("User", ["password"]),
        id: true,
        email: true,
      },
    });

    const tokenPayload = { id: newUser.id, email: newUser.email };
    const emailVerificationToken = this.tokenService.generateToken(
      tokenPayload,
      process.env.JWT_SECRET_VERIFICATION!,
      { expiresIn: "15m" }
    );

    const verificationLink = `${process.env.FRONTEND_URL}/sign-up/set-password?token=${emailVerificationToken}`;

    await this.mailService.sendVerificationEmail(
      newUser.email,
      verificationLink
    );

    await this.prisma.user.update({
      where: { id: newUser.id },
      data: { verificationSentAt: new Date() },
    });

    return newUser;
  };

  /** REGISTER TENANT */
  registerTenant = async (body: RegisterTenantDTO) => {
    const { firstName, lastName, email, phone } = body;

    const existingUser = await this.prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
    if (existingUser) throw new ApiError("Email already exists", 400);

    const newUser = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        isVerified: false,
        role: Role.TENANT,
        provider: Provider.CREDENTIAL,
        resetPasswordTokenUsed: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const newTenant = await this.prisma.tenant.create({
      data: {
        userId: newUser.id,
        name: `${firstName} ${lastName}`,
        phone: phone || null,
      },
    });

    const tokenPayload = { id: newUser.id, email: newUser.email };
    const emailVerificationToken = this.tokenService.generateToken(
      tokenPayload,
      process.env.JWT_SECRET_VERIFICATION!,
      { expiresIn: "15m" }
    );

    const verificationLink = `${process.env.FRONTEND_URL}/sign-up/set-password?token=${emailVerificationToken}`;

    await this.mailService.sendVerificationEmail(
      newUser.email,
      verificationLink
    );

    await this.prisma.user.update({
      where: { id: newUser.id },
      data: { verificationSentAt: new Date() },
    });

    return { ...newUser, tenant: newTenant };
  };

  /** VERIFY EMAIL & SET PASSWORD */
  verifyEmailAndSetPassword = async (
    body: VerificationDTO,
    authUserId: number
  ) => {
    const { password } = body;

    const existingUser = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!existingUser || existingUser.isVerified) {
      throw new ApiError("Invalid or already verified user/token", 400);
    }

    const hashedPassword = await this.passwordService.hashPassword(password);

    return this.prisma.user.update({
      where: { id: authUserId },
      data: {
        password: hashedPassword,
        isVerified: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        imageUrl: true,
        role: true,
        provider: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  };

  /** GOOGLE AUTH */
  googleAuth = async (body: GoogleAuthDTO) => {
    const { tokenId } = body;

    const ticket = await this.googleClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified)
      throw new ApiError("Google account not verified", 400);

    const { email, name, picture } = payload;
    const [firstName, ...lastNameParts] = (name || "").split(" ");
    const lastName = lastNameParts.join(" ") || "";

    let user = await this.prisma.user.findFirst({
      where: { email, provider: Provider.GOOGLE, isDeleted: false },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          imageUrl: picture,
          role: Role.USER,
          provider: Provider.GOOGLE,
          isVerified: true,
          resetPasswordTokenUsed: false,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { firstName, lastName, imageUrl: picture, isVerified: true },
      });
    }

    const accessToken = this.tokenService.generateToken(
      { id: user.id, role: user.role },
      env().JWT_SECRET
    );

    const { password: pw, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, accessToken };
  };

  /** FORGOT PASSWORD */
  forgotPassword = async (body: ForgotPasswordDto) => {
    const { email } = body;
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!existingUser) throw new ApiError("Email is not registered", 400);
    if (existingUser.provider === Provider.GOOGLE) {
      throw new ApiError(
        "This account uses Google Sign-In. Please login using Google",
        400
      );
    }

    const resetPasswordToken = this.tokenService.generateToken(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_SECRET_RESET_PASSWORD!,
      { expiresIn: "15m" }
    );

    await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        resetPasswordToken,
        resetPasswordTokenUsed: false,
      },
    });

    const resetPasswordLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetPasswordToken}`;
    await this.mailService.sendResetPasswordEmail(
      existingUser.email,
      resetPasswordLink,
      existingUser.firstName
    );

    return existingUser;
  };

  /** RESET PASSWORD */
  resetPassword = async (body: ResetPasswordDTO, token: string) => {
    const { newPassword } = body;

    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: token, resetPasswordTokenUsed: false },
    });
    if (!user) throw new ApiError("Invalid or expired token", 400);

    const hashedPassword = await this.passwordService.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenUsed: true,
      },
    });

    return { message: "Password reset successfully" };
  };

  /** RESEND EMAIL VERIFICATION */
  resendEmailVerif = async (body: ForgotPasswordDto) => {
    const { email } = body;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new ApiError("User not found", 404);
    if (user.isVerified) throw new ApiError("User is already verified", 400);

    const emailVerificationToken = this.tokenService.generateToken(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET_VERIFICATION!,
      { expiresIn: "15m" }
    );

    const verificationLink = `${process.env.FRONTEND_URL}/reverify?token=${emailVerificationToken}`;

    await this.mailService.sendVerificationEmailOnly(
      user.email,
      verificationLink
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationSentAt: new Date() },
    });

    return { message: "Verification email sent successfully" };
  };

  /** VERIFY EMAIL ONLY */
  verifyEmail = async (authUserId: number) => {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!existingUser || existingUser.isVerified) {
      throw new ApiError("Invalid or already verified user/token", 400);
    }

    return this.prisma.user.update({
      where: { id: authUserId },
      data: { isVerified: true },
      select: prismaExclude("User", ["password"]),
    });
  };

  /** CHANGE PASSWORD */
  changePassword = async (authUserId: number, body: ChangePasswordDTO) => {
    const { oldPassword, newPassword, confirmPassword } = body;

    if (newPassword !== confirmPassword) {
      throw new ApiError("New password and confirm password do not match", 400);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });
    if (!existingUser || !existingUser.password) {
      throw new ApiError("Invalid user", 400);
    }

    const isPasswordCorrect = await this.passwordService.comparePassword(
      oldPassword,
      existingUser.password
    );
    if (!isPasswordCorrect) throw new ApiError("Old password incorrect", 400);

    const isSamePassword = await this.passwordService.comparePassword(
      newPassword,
      existingUser.password
    );
    if (isSamePassword)
      throw new ApiError(
        "New password must be different from old password",
        400
      );

    const hashedNewPassword = await this.passwordService.hashPassword(
      newPassword
    );

    const updatedUser = await this.prisma.user.update({
      where: { id: authUserId },
      data: { password: hashedNewPassword },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  };
}
