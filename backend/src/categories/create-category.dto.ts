import { IsNotEmpty, IsString, IsOptional, IsMongoId} from "class-validator";

export class CreateCategoryDTO{
    @IsString()
    @IsNotEmpty()
    name:string;

    @IsString()
    @IsNotEmpty()
    slug:string;

    @IsString()
    @IsNotEmpty()
    productType:string;

    @IsOptional()
    @IsMongoId()
    parentId?:string | null;
}