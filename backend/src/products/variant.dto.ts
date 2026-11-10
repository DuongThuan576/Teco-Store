import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl, IsNumber, IsInt, Min, isNotEmpty } from "class-validator";

export class VariantDTO {
    @IsNotEmpty()
    @IsString()
    sku: string;
    
    @IsNotEmpty()
    @IsString()
    color?: string;
    
    @IsOptional()
    @IsString()
    storage?: string;
        
    @IsUrl({},{each:true})
    @IsArray()
    @IsOptional()
    images?: string[];
    
    @IsNumber()
    @Min(0)
    price: number;


    @IsInt()
    @Min(0)
    stock: number;
}