import { IsNotEmpty, IsString } from "class-validator";

export class VerificationDTO {
  @IsNotEmpty()
  @IsString()
  password!: string;
}
