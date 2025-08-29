import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ChangePasswordDTO {
  @IsNotEmpty()
  @IsString()
  oldPassword!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword!: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword!: string;
}
