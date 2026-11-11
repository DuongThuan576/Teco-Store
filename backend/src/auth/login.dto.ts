import { IsString, IsEmail, IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class LoginDTO {
    @IsNotEmpty()
    @IsEmail()
    email:string

    @IsString()
    @MaxLength(72)
    @MinLength(8)
    @IsNotEmpty()
    password:string
}