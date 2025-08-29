import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserDTO } from "./dto/updateUser.dto";

@injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  getUser = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    const { password: pw, ...userWithoutPassword } = user;

    return { ...userWithoutPassword };
  };

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

    const { password: pw, ...updatedUserWithoutPassword } = updatedUser;

    return { ...updatedUserWithoutPassword };
  };

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
