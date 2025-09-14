import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserDTO } from "./dto/updateUser.dto";

export class UserService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  /** GET USER */
  getUser = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  };

  /** UPDATE USER */
  updateUser = async (authUserId: number, body: UpdateUserDTO) => {
    const { firstName, lastName, email } = body;

    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });
    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    const isEmailChanged = email && email !== user.email;

    const updatedUser = await this.prisma.user.update({
      where: { id: authUserId },
      data: {
        firstName,
        lastName,
        email,
        isVerified: isEmailChanged ? false : user.isVerified,
      },
    });

    const { password, ...updatedUserWithoutPassword } = updatedUser;
    return updatedUserWithoutPassword;
  };

  /** UPLOAD PROFILE PICTURE */
  uploadProfilePic = async (authUserId: number, uploadPath: string) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });
    if (!user) throw new ApiError("Invalid user id", 404);

    const updatedUser = await this.prisma.user.update({
      where: { id: authUserId },
      data: { imageUrl: uploadPath },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  };
}
