import { IsEnum, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { StatusPayment } from "../../../generated/prisma";
import { PaginationQueryParams } from "../../pagination/pagination.dto";

export class GetTenantPaymentsDto extends PaginationQueryParams {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  q?: string;

  // Optional: filter explicitly by status if you ever need it
  @IsOptional()
  @IsEnum(StatusPayment)
  status?: StatusPayment;
}
