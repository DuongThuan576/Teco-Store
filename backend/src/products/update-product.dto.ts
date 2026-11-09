import { IsString, IsNotEmpty, Min, IsNumber, IsOptional } from "class-validator";

export class UpdateProductDTO {
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    price?: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    brand?: string;
}