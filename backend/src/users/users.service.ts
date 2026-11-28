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
import { UpdateUserRoleDto } from './update-user-role.dto';

import { ForbiddenException } from '@nestjs/common';
import { subject } from '@casl/ability';

import { AbilityFactory } from '../auth/authorization/ability/ability.factory';
import { Action } from '../auth/authorization/enums/action.enum';
import { Subject } from '../auth/authorization/enums/subject.enum';

import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { UpdateUserStatusDto } from './update-user-status.dto';
import { UserRole } from '../auth/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(AuthSession.name)
    private readonly authSessionModel: Model<AuthSession>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly abilityFactory: AbilityFactory,
  ) {}

  async getMyProfile(user: AuthenticatedUser) {
    const userId = user.id;
    // 1. Kiểm tra userId hợp lệ
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        'User ID không hợp lệ',
      );
    }

    // 2. Tìm User trong MongoDB
    const profile = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select(
        'fullName email phone role status createdAt updatedAt',
      )
      .lean()
      .exec();

    // 3. Kiểm tra User có tồn tại không
    if (!profile) {
      throw new NotFoundException(
        'Không tìm thấy tài khoản',
      );
    }


    const ability = this.abilityFactory.createForUser(user);

    const userSubject = subject(Subject.User, {
        _id: String(profile._id),
    });

    if (!ability.can(Action.Read, userSubject)) {
        throw new ForbiddenException(
            'Bạn không có quyền xem hồ sơ này',
        );
    }

    // 4. Chỉ trả về dữ liệu cần thiết
    return {
      id: String(profile._id),
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      status: profile.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }


    async updateMyProfile(
        user: AuthenticatedUser,
        dto: UpdateProfileDTO,
        ) {

        const userId = user.id;
        // 1. Kiểm tra User ID
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }

        const ability = this.abilityFactory.createForUser(user);

        const userSubject = subject(Subject.User, {
            _id: userId,
        });

        if (!ability.can(Action.Update, userSubject)) {
            throw new ForbiddenException(
                'Bạn không có quyền cập nhật hồ sơ này',
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
        user: AuthenticatedUser,
        dto: ChangePasswordDTO,
        ) {

        const userId = user.id;
        // 1. Kiểm tra User ID
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }

        const ability = this.abilityFactory.createForUser(user);

        const userSubject = subject(Subject.User, {
            _id: userId,
        });

        if (!ability.can(Action.ChangePassword, userSubject)) {
            throw new ForbiddenException(
                'Bạn không có quyền đổi mật khẩu này',
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

                    $inc: {
                    tokenVersion:1
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

    async getAllUsers(page = 1, limit = 10){
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            this.userModel
            .find()
            .select('fullName email phone role status createdAt updatedAt')
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),

            this.userModel.countDocuments().exec(),
        ]);

        return {
            data: users.map((user) => ({
            id: String(user._id),
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            })),
            pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getUserDetail (userId : string){
        //Kiểm tra định dạng ObjectID
        if (!Types.ObjectId.isValid(userId)){
            throw new BadRequestException (
                'User ID không hợp lệ'
            );
        };

        //Tìm user trong DB
        const user = await this.userModel
        .findById(new Types.ObjectId(userId))
        .select(
            'fullName email phone role status createdAt updatedAt'
        )
        .lean()
        .exec()

        if(!user){
            throw new NotFoundException(
                'Không tìm thấy tài khoản'
            );
        };

        return {
            id: String(user._id),
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }
    }


    async updateUserStatus(
        adminId: string,
        userId: string,
        dto: UpdateUserStatusDto,
    ) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }

        if (adminId === userId) {
            throw new ForbiddenException(
            'Không thể tự khóa hoặc thay đổi trạng thái tài khoản của mình',
            );
        }

        const userObjectId = new Types.ObjectId(userId);

        const updatedUser = await this.connection.transaction(
            async (session) => {
            const target = await this.userModel
                .findById(userObjectId)
                .session(session)
                .exec();

            if (!target) {
                throw new NotFoundException(
                'Không tìm thấy tài khoản',
                );
            }

            // Không quản lý trạng thái của Admin khác
            // qua API này để tránh khóa nhầm quản trị viên.
            if (target.role === UserRole.ADMIN) {
                throw new ForbiddenException(
                'Không thể thay đổi trạng thái tài khoản Admin',
                );
            }

            if (target.status === dto.status) {
                throw new ConflictException(
                'Tài khoản đã ở trạng thái này',
                );
            }

            const updated = await this.userModel
                .findOneAndUpdate(
                {
                    _id: userObjectId,
                    status: target.status,
                    role: target.role,
                },
                {
                    $set: {
                    status: dto.status,
                    },
                    $inc: {
                    tokenVersion: 1,
                    },
                },
                {
                    session,
                    returnDocument: 'after',
                    runValidators: true,
                },
                )
                .select(
                'fullName email phone role status createdAt updatedAt',
                )
                .lean()
                .exec();

            if (!updated) {
                throw new ConflictException(
                'Trạng thái tài khoản đã thay đổi, vui lòng thử lại',
                );
            }

            // Thu hồi mọi Refresh Session đang hoạt động.
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

            return updated;
            },
        );

        return {
                message:
                dto.status === 'inactive'
                    ? 'Khóa tài khoản thành công'
                    : 'Mở khóa tài khoản thành công',
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


    async updateUserRole(
        adminId: string,
        userId: string,
        dto: UpdateUserRoleDto,
    ) {
        // 1. Kiểm tra ObjectId
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }

        // 2. Không cho Admin tự thay đổi Role
        if (adminId === userId) {
            throw new ForbiddenException(
            'Không thể tự thay đổi Role của mình',
            );
        }

        const userObjectId = new Types.ObjectId(userId);

        // 3. Transaction cập nhật User và Session
        const updatedUser = await this.connection.transaction(
            async (session) => {
            const target = await this.userModel
                .findById(userObjectId)
                .session(session)
                .exec();

            if (!target) {
                throw new NotFoundException(
                'Không tìm thấy tài khoản',
                );
            }

            // 4. Không thay đổi tài khoản Admin
            if (target.role === UserRole.ADMIN) {
                throw new ForbiddenException(
                'Không thể thay đổi Role của Admin',
                );
            }

            // 5. Kiểm tra Role trùng
            if (target.role === dto.role) {
                throw new ConflictException(
                'Tài khoản đã có Role này',
                );
            }

            // 6. Cập nhật có điều kiện
            const updated = await this.userModel
                .findOneAndUpdate(
                {
                    _id: userObjectId,
                    role: target.role,
                },
                {
                    $set: {
                    role: dto.role,
                    },
                    $inc: {
                    tokenVersion: 1,
                    },
                },
                {
                    session,
                    returnDocument: 'after',
                    runValidators: true,
                },
                )
                .select(
                'fullName email phone role status createdAt updatedAt',
                )
                .lean()
                .exec();

            if (!updated) {
                throw new ConflictException(
                'Role đã thay đổi, vui lòng thử lại',
                );
            }

            // 7. Thu hồi toàn bộ Refresh Sessions
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

            return updated;
            },
        );

        // 8. Trả response an toàn
        return {
            message: 'Thay đổi Role thành công',
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

}
