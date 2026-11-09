import { IsString, IsNotEmpty, IsNumber, Min } from "class-validator";

export class CreateProductDTO {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @Min(1)
    price: number;

    @IsString()
    @IsNotEmpty()
    brand: string;
}