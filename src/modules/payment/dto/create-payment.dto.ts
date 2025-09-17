import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
} from "class-validator";

export enum PaymentMethode {
  MANUAL = "MANUAL",
  OTOMATIS = "OTOMATIS",
}

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  roomId!: number;

  @IsInt()
  @Min(0)
  totalPrice!: number;

  @IsInt()
  @IsPositive()
  duration!: number;

  @IsOptional()
  @IsEnum(PaymentMethode)
  paymentMethode?: PaymentMethode = PaymentMethode.MANUAL;

  @IsOptional()
  @IsString()
  @IsUrl()
  paymentProof?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  invoiceUrl?: string;

  @IsOptional()
  @IsDateString()
  expiredAt?: string;
}
