import { IsNotEmpty, IsOptional, IsString } from "class-validator";
export class RegisterTenantDTO {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsNotEmpty()
  @IsString()
  email!: string;

  @IsOptional()
  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  bankName!: string;

  @IsOptional()
  @IsString()
  bankNumber!: string;
}
