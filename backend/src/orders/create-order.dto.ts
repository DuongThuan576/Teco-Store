import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength, Matches } from "class-validator";
import { PaymentMethod } from "./enums/payment-method.enum";

export class CreateOrderDto {
    @IsOptional()
    @IsString()
    @Matches(/^[A-Za-z0-9_-]{3,30}$/)
    voucherCode?: string;

    //ID địa chỉ khi checkout
    @IsMongoId()
    addressId: string;

    //Phương thức thanh toán
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    //ghi chú giao hàng không bắt buộc
    @IsOptional()
    @IsString()
    @MaxLength(500)
    note?: string;
}