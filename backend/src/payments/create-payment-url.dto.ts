import { IsMongoId } from 'class-validator';

export class CreatePaymentUrlDto {
    @IsMongoId()
    orderId: string;
}