import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Request } from "express";

import { User } from "../schemas/user.schema";
import { UserRole } from "../user-role.enum";

interface JwtPayLoad {
    sub: string;
    role: UserRole;
    iat?:number;
    exp?:number;
}

export interface AuthenticatedUser {
    id:string;
    email: string;
    role : UserRole;
}

export interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate{
    constructor(
        private readonly jwtService: JwtService,

        @InjectModel(User.name)
        private readonly userModel:Model<User>,
    ){}

    async canActivate(context: ExecutionContext,): Promise<boolean> {
        //Lấy HTTP request
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

        //Đọc authorization header 
        const authorization = request.headers.authorization;

        if (!authorization) {
            throw new UnauthorizedException(
                'Thiếu Access Token',
            );
        }

        //Kiểm tra định dạng Bearer Token
        const [type, token, ...extra] =authorization.split(' ');

        if(
            type !== 'Bearer' ||
            !token ||
            extra.length >0
        ){
            throw new UnauthorizedException(
                'Authorization Header không hợp lệ'
            );
        }

        //Xác minh JWT
        let payload : JwtPayLoad;
        try {
            payload = await this.jwtService.verifyAsync<JwtPayLoad>(token);
        }catch {
            throw new UnauthorizedException(
                'Access Token không hợp lệ hoặc đã hết hạn',
            );
        }

        //Kiểm tra Id từ token 
        if(
            !payload ||
            typeof payload.sub !== 'string' ||
            !Types.ObjectId.isValid(payload.sub)
        ){
            throw new UnauthorizedException(
                'Access token không hợp lệ'
            );
        }

        //Lấy user từ mongo
        const user = await this.userModel.findById(payload.sub).exec();

        if (!user || user.status !== 'active'){
            throw new UnauthorizedException(
                'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa'
            );
        }

        //Gắn user đã xác thực vào request
        request.user = {
            id: String(user._id),
            email: user.email,
            role: user.role,
        };

        return true;
    }
}