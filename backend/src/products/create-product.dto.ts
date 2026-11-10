import { IsString, IsNotEmpty, IsBoolean,  IsObject, IsArray, IsOptional, IsUrl, IsMongoId, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { VariantDTO } from "./variant.dto";

export class CreateProductDTO {
        @IsString()
        @IsNotEmpty()
        name:string;
    
        @IsString()
        @IsNotEmpty()
        slug: string;
    
        @IsOptional()
        @IsString()
        description?: string;
    
        @IsOptional()
        @IsArray()
        @IsUrl({},{each: true})
        images?: string[];
    
        @IsOptional()
        @IsBoolean()
        isActive?: boolean;  
    
        @IsOptional()
        @IsMongoId()
        categoryId?: string;
    
        @IsOptional()
        @IsMongoId()
        brandId?: string;
    
        @IsOptional()
        @IsMongoId()
        productLineId?: string;
    
        @IsOptional()
        @IsObject()
        specifications?: Record<string,unknown>;

        @IsArray()
        @ValidateNested({each: true})
        @Type(() => VariantDTO)
        variants: VariantDTO[];
    
}