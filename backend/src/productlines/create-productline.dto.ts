import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsIn, IsDefined  } from "class-validator";

export class CreateProductLineDTO {

    @IsString()
    @IsNotEmpty()
    name:string;

    @IsString()
    @IsNotEmpty()
    slug:string;
    
    @IsDefined()
    @IsMongoId()
    brandId:string;
    
    @IsDefined()
    @IsMongoId()
    categoryId:string;
    
    @IsOptional()
    @IsMongoId()
    parentId?:string| null;
    
    @IsOptional()
    @IsIn(['active','inactive'])
    status?:string;
}