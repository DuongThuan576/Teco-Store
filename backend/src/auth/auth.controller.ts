import { Controller, Post, Body, HttpCode, HttpStatus, Req, UseGuards, Get, Res, UnauthorizedException,
    Query, DefaultValuePipe, ParseIntPipe, ForbiddenException, BadRequestException
 } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDTO } from './register.dto';
import { LoginDTO } from './login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';
import type { Response, Request } from 'express';
import { UserRole } from './user-role.enum';

@Controller('auth')
export class AuthController {
    constructor (
        private readonly authService: AuthService,
    ){}

    //Đăng ký
    @Post('register')
    register(@Body() dto : RegisterDTO){
        return this.authService.register(dto);
    }

    //Đăng Nhập
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto : LoginDTO,
        @Res({passthrough:true}) res: Response,
    ){
        const {refreshToken, ...result} = await this.authService.login(dto);

        res.cookie('refreshToken', refreshToken, {  
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:'lax',
            path:'/api/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return result;
    }

    //Lấy thông tin tài khoản
    @Get('me')
    @UseGuards(JwtAuthGuard)
    getProfile(@Req() request: AuthenticatedRequest){
        return{
            message:"Lấy thông tin tài khoản thành công",
            user:request.user,
        }
    }


    //Refresh token
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
        async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        ) {
        const token = req.cookies?.refreshToken;

        if (typeof token !== 'string') {
            throw new UnauthorizedException(
            'Thiếu Refresh Token',
            );
        }

        const { refreshToken, ...result } =
            await this.authService.refresh(token);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return result;
    }

    //Đăng Xuất
    @Post('logout')
    @HttpCode(HttpStatus.OK)
        async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        ) {
        // 1. Lấy Refresh Token từ Cookie
        const refreshToken = req.cookies?.refreshToken;

        // 2. Thu hồi phiên trong MongoDB
        await this.authService.logout(
            typeof refreshToken === 'string'
            ? refreshToken
            : undefined,
        );

        // 3. Xóa Cookie phía Client
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth',
        });

        // 4. Trả kết quả
        return {
            message: 'Đăng xuất thành công',
        };
    }

    //Xem các sessions đăng nhập (admin)
    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    async getSessions(
        @Req() req: AuthenticatedRequest,

        @Query('page', new DefaultValuePipe(1), ParseIntPipe)
        page: number,

        @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
        limit: number,
        ) {
        // 1. Chỉ Admin được xem danh sách phiên
        if (req.user?.role !== UserRole.ADMIN) {
            throw new ForbiddenException(
            'Chỉ Admin được phép quản lý phiên đăng nhập',
            );
        }

        // 2. Kiểm tra giới hạn phân trang
        if (page < 1 || limit < 1 || limit > 100) {
            throw new BadRequestException(
            'page phải >= 1 và limit phải từ 1 đến 100',
            );
        }

        // 3. Gọi Service lấy danh sách phiên
        return this.authService.getSessions(page, limit);
    }



}
