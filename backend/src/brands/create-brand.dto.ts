import { IsString, IsNotEmpty, IsOptional, IsUrl, IsIn } from "class-validator";

export class CreateBrandDTO {
        @IsNotEmpty()
        @IsString()
        name:string;

        @IsNotEmpty()
        @IsString()
        slug:string;
    
        @IsOptional()
        @IsUrl()
        logo?:string;

        @IsOptional()
        @IsIn(['active','inactive'])
        status?:string;
}