import { Injectable, ConflictException, ForbiddenException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model,Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

import { User } from './schemas/user.schema';
import { RegisterDTO } from './register.dto';
import { LoginDTO } from './login.dto';
import { UserRole } from './user-role.enum';
import { JwtService } from '@nestjs/jwt';
import { AuthSession } from './schemas/auth-session.schema';



@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel:Model<User>,

        private readonly jwtService:JwtService,

        @InjectModel(AuthSession.name)
        private readonly authSessionModel:Model<AuthSession>
    ){}

    //Đăng ký
    async register( registerDTO : RegisterDTO){
        //Chuẩn hóa email mới
        const email = registerDTO.email.trim().toLocaleLowerCase()

        //Kiểm tra email tồn tại chưa
        const existingUser = await this.userModel.findOne({email}).exec();

        if (existingUser){
            throw new ConflictException(
                'Email đã được đăng ký',
            );
        }

        //Kiểm tra giới hạn 72Byte của bcrypt
        if(Buffer.byteLength(registerDTO.password,'utf-8') >72 ){
            throw new BadRequestException(
                'Mật khẩu không được quá 72 Byte UTF-8'
            );
        }

        //hash mật khẩu 
        const hashedPassword = await bcrypt.hash(registerDTO.password, 12);

        //Tạo user
        try {
            const user = await this.userModel.create({
                fullName: registerDTO.fullName.trim(),
                email,
                password: hashedPassword,
                phone: registerDTO.phone ?? '',
                role: UserRole.CUSTOMER,
                status:'active' 
            });
            
            //trả về kết quả
            return {
                message: 'Đăng ký thành công',
                user: {
                    id:String(user._id),
                    fullname: user.fullName,
                    email: user.email,
                    role: user.role,
                },
            };
        }catch (error){
            if( typeof error === 'object' && error !== null && 'code' in error && error.code === 11000){
                throw new ConflictException(
                    'Email đã được đăng ký'
                )
            }
            throw error;
        }
    }

    //Đăng nhập
    async login(dto:LoginDTO){
        //chuẩn hóa email
        const email = dto.email.trim().toLowerCase();

        //Tìm user, lấy thêm password hash
        const user = await this.userModel.findOne({email}).select('+password').exec();

        //Kiểm tra user tồn tại
        if (!user){
            throw new NotFoundException(
                'Tài khoản hoặc mật khẩu không chính xác'
            );
        }

        //Kiểm tra mật khẩu
        const isMatch = await bcrypt.compare(dto.password, user.password);

        if(!isMatch){
            throw new NotFoundException(
                'Tài khoản hoặc mật khẩu không chính xác'
            );
        }

        //Kiểm tra trạng thái tài khoản
        if (user.status !== 'active'){
            throw new ForbiddenException(
                'Tài khoản đang bị vô hiệu hóa'
            );
        }

        const payload = {
            sub: String(user._id),
            role: user.role
        };

        const accessToken = await this.jwtService.signAsync(payload)

        const refreshToken = await this.createRefreshSession(String(user._id));

        //Đăng nhập hợp lệ 
        return {
            message: 'Xác thực thông tin đăng nhập thành công',
            accessToken,
            refreshToken,
            tokenType:'Bearer',
            expiresIn:900,
            user: {
                id: String(user._id),
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            },
        };

    }

    private hashRefreshToken(token:string):string{
        return createHash('sha256').update(token).digest('hex');
    }

    async createRefreshSession(
        userId: string,
    ): Promise<string>{
        //sinh bí mật ngẫu nhiên
        const secret = randomBytes(32).toString('hex');

        //Hash bí mật trước khi lưu
        const tokenHash = this.hashRefreshToken(secret);

        //Thời hạn 7 ngày 
        const expiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
        );

        //Tạo phiên đăng nhập
        const session = await this.authSessionModel.create({
            userId: new Types.ObjectId(userId),
            tokenHash,
            expiresAt,
            revokedAt: null,
        });

        return `${String(session._id)}.${secret}`
    }

    //refresh Token
    async refresh (refreshToken:string){
        //Kiểm tra định dạng token
        if (
            !/^[a-f0-9]{24}\.[a-f0-9]{64}$/i.test(
            refreshToken ?? '',
            )
        ) {
            throw new UnauthorizedException(
            'Refresh Token không hợp lệ',
            );
        }

        //Tách Session Id và secret
        const [sessionId, secret] = refreshToken.split('.');

        //HAsh secret để so sánh
        const oldHash = this.hashRefreshToken(secret);

        //Tìm phiên còn hiệu lực
        const session = await this.authSessionModel.findOne({
            _id: sessionId,
            tokenHash: oldHash,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        });

        if (!session) {
            throw new UnauthorizedException(
            'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
            );
        }

        //Kiểm tra user hiện tại
        const user = await this.userModel.findById(
            session.userId,
        );

        if (!user || user.status !== 'active') {
            throw new UnauthorizedException(
            'Tài khoản không còn hoạt động',
            );
        }

        //tạo refresh token mới
        const newSecret = randomBytes(32).toString('hex');
        const newHash = this.hashRefreshToken(newSecret);

        const newExpiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
        );

        //Rotation bằng thao tác cập nhật nguyên tử
        const updatedSession =
            await this.authSessionModel.findOneAndUpdate(
            {
                _id: sessionId,
                tokenHash: oldHash,
                revokedAt: null,
                expiresAt: { $gt: new Date() },
            },
            {
                $set: {
                tokenHash: newHash,
                expiresAt: newExpiresAt,
                },
            },
            { new: true },
            );

        if (!updatedSession) {
            throw new UnauthorizedException(
            'Refresh Token đã được sử dụng hoặc không còn hợp lệ',
            );
        }

        //Tạo JWT Access Token mới
        const accessToken = await this.jwtService.signAsync({
            sub: String(user._id),
            role: user.role,
        });
    
        //Trả cặp token mới
        return {
            accessToken,
            refreshToken: `${sessionId}.${newSecret}`,
            tokenType: 'Bearer',
            expiresIn: 900,
        };
    }

    //Đăng xuất
    async logout(refreshToken?: string): Promise<void> {
        // 1. Nếu không có Refresh Token thì kết thúc
        if (!refreshToken) {
            return;
        }

        // 2. Kiểm tra định dạng token
        const isValidFormat =
            /^[a-f0-9]{24}\.[a-f0-9]{64}$/i.test(refreshToken);

        if (!isValidFormat) {
            return;
        }

        // 3. Tách Session ID và secret
        const [sessionId, secret] = refreshToken.split('.');

        // 4. Hash secret
        const tokenHash = this.hashRefreshToken(secret);

        // 5. Thu hồi phiên tương ứng
        await this.authSessionModel.updateOne(
            {
            _id: sessionId,
            tokenHash,
            revokedAt: null,
            },
            {
            $set: {
                revokedAt: new Date(),
            },
            },
        );
    }

    // Lấy các phiên đăng nhập
    async getSessions(page = 1, limit = 10) {
        // 1. Tính số document cần bỏ qua
        const skip = (page - 1) * limit;

        // 2. Chỉ lấy những trường cần thiết
        const [sessions, total] = await Promise.all([
            this.authSessionModel
            .find({})
            .select(
                '_id userId createdAt updatedAt expiresAt revokedAt',
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),

            this.authSessionModel.countDocuments({}),
        ]);

        // 3. Xác định trạng thái từng phiên
        const now = new Date();

        const data = sessions.map((session) => {
            let status = 'active';

            if (session.revokedAt) {
            status = 'revoked';
            } else if (session.expiresAt <= now) {
            status = 'expired';
            }

            return {
            id: String(session._id),
            userId: String(session.userId),
            status,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            expiresAt: session.expiresAt,
            revokedAt: session.revokedAt,
            };
        });

        // 4. Trả kết quả phân trang
        return {
            data,
            pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            },
        };
    }


}
