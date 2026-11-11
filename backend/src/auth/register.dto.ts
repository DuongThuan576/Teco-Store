import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength, MaxLength } from "class-validator";

export class RegisterDTO {
    @IsString()
    @IsNotEmpty()
    fullName:string

    @IsEmail()
    email:string

    @IsString()
    @IsNotEmpty()
    @MaxLength(72)
    @MinLength(8)
    password:string

    @IsString()
    @IsOptional()
    phone?:string

}