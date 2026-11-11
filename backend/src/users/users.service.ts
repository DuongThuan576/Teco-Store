import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException
} from '@nestjs/common';

import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as bcrypt from 'bcrypt';

import {
  Model,
  Types,
  isValidObjectId,
} from 'mongoose';

import { User } from '../auth/schemas/user.schema';
import { UpdateProfileDTO } from './update-profile.dto';
import { AuthSession } from '../auth/schemas/auth-session.schema';
import { ChangePasswordDTO } from './change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(AuthSession.name)
    private readonly authSessionModel: Model<AuthSession>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getMyProfile(userId: string) {
    // 1. Kiểm tra userId hợp lệ
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        'User ID không hợp lệ',
      );
    }

    // 2. Tìm User trong MongoDB
    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select(
        'fullName email phone role status createdAt updatedAt',
      )
      .lean()
      .exec();

    // 3. Kiểm tra User có tồn tại không
    if (!user) {
      throw new NotFoundException(
        'Không tìm thấy tài khoản',
      );
    }

    // 4. Chỉ trả về dữ liệu cần thiết
    return {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }


    async updateMyProfile(
        userId: string,
        dto: UpdateProfileDTO,
        ) {
        // 1. Kiểm tra User ID
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }

        // 2. Chỉ cho phép cập nhật fullName và phone
        const updateData: Record<string, string> = {};

        if (dto.fullName !== undefined) {
            const fullName = dto.fullName.trim();

            if (!fullName) {
            throw new BadRequestException(
                'Họ tên không được để trống',
            );
            }

            updateData.fullName = fullName;
        }

        if (dto.phone !== undefined) {
            updateData.phone = dto.phone.trim();
        }

        // 3. Không cho phép Body rỗng
        if (Object.keys(updateData).length === 0) {
            throw new BadRequestException(
            'Không có thông tin cần cập nhật',
            );
        }

        // 4. Tìm và cập nhật User
        const updatedUser =
            await this.userModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(userId),
                status: 'active',
            },
            {
                $set: updateData,
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
            )
            .select(
            'fullName email phone role status createdAt updatedAt',
            )
            .lean()
            .exec();

        // 5. Kiểm tra User
        if (!updatedUser) {
            throw new NotFoundException(
            'Không tìm thấy tài khoản đang hoạt động',
            );
        }

        // 6. Trả thông tin mới
        return {
            message: 'Cập nhật thông tin cá nhân thành công',
            user: {
            id: String(updatedUser._id),
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            status: updatedUser.status,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
            },
        };
    }


    async changePassword(
        userId: string,
        dto: ChangePasswordDTO,
        ) {
        // 1. Kiểm tra User ID
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }

        // 2. Kiểm tra giới hạn bcrypt
        if (
            Buffer.byteLength(dto.newPassword, 'utf8') > 72
        ) {
            throw new BadRequestException(
            'Mật khẩu mới không được quá 72 byte UTF-8',
            );
        }

        const userObjectId = new Types.ObjectId(userId);

        // 3. Thực hiện thay đổi trong Transaction
        await this.connection.transaction(
            async (session) => {
            // 4. Tìm User, lấy thêm mật khẩu đã hash
            const user = await this.userModel
                .findOne({
                _id: userObjectId,
                status: 'active',
                })
                .select('+password')
                .session(session)
                .exec();

            if (!user) {
                throw new UnauthorizedException(
                'Tài khoản không còn hoạt động',
                );
            }

            // 5. Kiểm tra mật khẩu hiện tại
            const isCurrentPasswordValid =
                await bcrypt.compare(
                dto.currentPassword,
                user.password,
                );

            if (!isCurrentPasswordValid) {
                throw new BadRequestException(
                'Mật khẩu hiện tại không chính xác',
                );
            }

            // 6. Không cho dùng lại mật khẩu hiện tại
            const isSamePassword = await bcrypt.compare(
                dto.newPassword,
                user.password,
            );

            if (isSamePassword) {
                throw new BadRequestException(
                'Mật khẩu mới phải khác mật khẩu hiện tại',
                );
            }

            // 7. Hash mật khẩu mới
            const hashedPassword = await bcrypt.hash(
                dto.newPassword,
                12,
            );

            // 8. Cập nhật mật khẩu
            const result = await this.userModel.updateOne(
                {
                _id: userObjectId,
                password: user.password,
                status: 'active',
                },
                {
                $set: {
                    password: hashedPassword,
                },
                },
                { session },
            );

            if (result.modifiedCount !== 1) {
                throw new ConflictException(
                'Mật khẩu đã thay đổi, vui lòng thử lại',
                );
            }

            // 9. Thu hồi tất cả Refresh Sessions
            await this.authSessionModel.updateMany(
                {
                userId: userObjectId,
                revokedAt: null,
                },
                {
                $set: {
                    revokedAt: new Date(),
                },
                },
                { session },
            );
            },
        );

        // 10. Chỉ trả kết quả khi Transaction thành công
        return {
            message:
            'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
        };
    }


}
