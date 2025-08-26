import { IsNotEmpty, IsString } from "class-validator";

export class ChangePasswordDTO {
  @IsNotEmpty()
  @IsString()
  oldPassword!: string;

  @IsNotEmpty()
  @IsString()
  newPassword!: string;
}
