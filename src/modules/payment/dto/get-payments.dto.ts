import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { StatusPayment } from "../../../generated/prisma";
import { PaginationQueryParams } from "../../pagination/pagination.dto";

export class GetTenantPaymentsDto extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  q?: string;

  @IsOptional()
  @IsEnum(StatusPayment)
  status?: StatusPayment;
}
