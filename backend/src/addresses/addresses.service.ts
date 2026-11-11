
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId, Connection } from 'mongoose';

import { Address } from './schemas/address.schema';
import { CreateAddressDTO } from './create-address.dto';
import { UpdateAddressDTO } from './update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name)
    private readonly addressModel: Model<Address>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getMyAddresses(userId: string) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        'User ID không hợp lệ',
      );
    }

    return this.addressModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .sort({
        isDefault: -1,
        createdAt: -1,
      })
      .lean()
      .exec();
  }


    async createAddress(
        userId: string,
        dto: CreateAddressDTO,
        ) {
        // 1. Kiểm tra User ID
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }

        const userObjectId = new Types.ObjectId(userId);

        // 2. Đếm số địa chỉ hiện tại của User
        const addressCount = await this.addressModel
            .countDocuments({
            userId: userObjectId,
            });

        // 3. Nếu là địa chỉ đầu tiên
        // thì tự đặt làm mặc định
        const isDefault = addressCount === 0;

        // 4. Tạo Address
        try {
            const address = await this.addressModel.create({
            ...dto,
            userId: userObjectId,
            isDefault,
            });

            return {
            message: 'Thêm địa chỉ giao hàng thành công',
            address,
            };
        } catch (error) {
            // 5. Xử lý trường hợp hai request cùng lúc
            // tạo địa chỉ mặc định bị trùng
            if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000
            ) {
            throw new ConflictException(
                'Địa chỉ vừa được cập nhật, vui lòng thử lại',
            );
            }

            throw error;
        }
    }


    async updateAddress(
        userId: string,
        addressId: string,
        dto: UpdateAddressDTO,
        ) {
        // 1. Kiểm tra ObjectId
        if (
            !isValidObjectId(userId) ||
            !isValidObjectId(addressId)
        ) {
            throw new BadRequestException(
            'User ID hoặc Address ID không hợp lệ',
            );
        }

        // 2. Chỉ lấy những trường được phép cập nhật
        const allowedFields = [
            'receiverName',
            'phone',
            'province',
            'district',
            'ward',
            'address',
        ] as const;

        const updateData: Record<string, string> = {};

        for (const field of allowedFields) {
            const value = dto[field];

            if (value !== undefined) {
            if (
                typeof value !== 'string' ||
                value.trim().length === 0
            ) {
                throw new BadRequestException(
                `${field} không được để trống`,
                );
            }

            updateData[field] = value.trim();
            }
        }

        // 3. Không cho request rỗng
        if (Object.keys(updateData).length === 0) {
            throw new BadRequestException(
            'Không có dữ liệu cần cập nhật',
            );
        }

        // 4. Tìm địa chỉ đúng ID và đúng chủ sở hữu
        const updatedAddress =
            await this.addressModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(addressId),
                userId: new Types.ObjectId(userId),
            },
            {
                $set: updateData,
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
            );

        // 5. Không tìm thấy địa chỉ thuộc User
        if (!updatedAddress) {
            throw new NotFoundException(
            'Không tìm thấy địa chỉ giao hàng',
            );
        }

        // 6. Trả kết quả
        return {
            message: 'Cập nhật địa chỉ thành công',
            address: updatedAddress,
        };
    }


    async setDefaultAddress(
        userId: string,
        addressId: string,
        ) {
        // 1. Kiểm tra ObjectId
        if (
            !isValidObjectId(userId) ||
            !isValidObjectId(addressId)
        ) {
            throw new BadRequestException(
            'User ID hoặc Address ID không hợp lệ',
            );
        }

        const userObjectId = new Types.ObjectId(userId);
        const addressObjectId = new Types.ObjectId(addressId);

        try {
            // 2. Bắt đầu transaction
            const updatedAddress =
            await this.connection.transaction(async (session) => {
                // 3. Kiểm tra địa chỉ có thuộc User không
                const targetAddress =
                await this.addressModel.findOne({
                    _id: addressObjectId,
                    userId: userObjectId,
                }).session(session);

                if (!targetAddress) {
                throw new NotFoundException(
                    'Không tìm thấy địa chỉ giao hàng',
                );
                }

                // 4. Nếu đã mặc định, không cần thay đổi
                if (targetAddress.isDefault) {
                return targetAddress;
                }

                // 5. Bỏ mặc định của địa chỉ hiện tại
                await this.addressModel.updateMany(
                {
                    userId: userObjectId,
                    isDefault: true,
                },
                {
                    $set: { isDefault: false },
                },
                { session },
                );

                // 6. Đặt địa chỉ được chọn làm mặc định
                const result =
                await this.addressModel.findOneAndUpdate(
                    {
                    _id: addressObjectId,
                    userId: userObjectId,
                    },
                    {
                    $set: { isDefault: true },
                    },
                    {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                    },
                );

                if (!result) {
                throw new NotFoundException(
                    'Địa chỉ không còn tồn tại',
                );
                }

                return result;
            });

            return {
            message: 'Đặt địa chỉ mặc định thành công',
            address: updatedAddress,
            };
        } catch (error) {
            // Xung đột Unique Index
            if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000
            ) {
            throw new ConflictException(
                'Không thể đổi địa chỉ mặc định, vui lòng thử lại',
            );
            }

            throw error;
        }
    }


    async removeAddress(
        userId: string,
        addressId: string,
        ) {
        // 1. Kiểm tra ObjectId
        if (
            !isValidObjectId(userId) ||
            !isValidObjectId(addressId)
        ) {
            throw new BadRequestException(
            'User ID hoặc Address ID không hợp lệ',
            );
        }

        const userObjectId = new Types.ObjectId(userId);
        const addressObjectId = new Types.ObjectId(addressId);

        try {
            // 2. Thực hiện trong MongoDB Transaction
            return await this.connection.transaction(
            async (session) => {
                // 3. Kiểm tra địa chỉ thuộc User
                const address = await this.addressModel
                .findOne({
                    _id: addressObjectId,
                    userId: userObjectId,
                })
                .session(session);

                if (!address) {
                throw new NotFoundException(
                    'Không tìm thấy địa chỉ giao hàng',
                );
                }

                // 4. Nếu xóa địa chỉ mặc định,
                // tìm địa chỉ thay thế
                let replacementAddress = null;

                if (address.isDefault) {
                replacementAddress = await this.addressModel
                    .findOne({
                    userId: userObjectId,
                    _id: { $ne: addressObjectId },
                    })
                    .sort({ createdAt: -1, _id: -1 })
                    .session(session);
                }

                // 5. Xóa địa chỉ được chọn
                await this.addressModel.deleteOne(
                {
                    _id: addressObjectId,
                    userId: userObjectId,
                },
                { session },
                );

                // 6. Chọn địa chỉ mặc định thay thế
                if (replacementAddress) {
                const result =
                    await this.addressModel.updateOne(
                    {
                        _id: replacementAddress._id,
                        userId: userObjectId,
                    },
                    { $set: { isDefault: true } },
                    { session },
                    );

                if (result.matchedCount !== 1) {
                    throw new ConflictException(
                    'Không thể chọn địa chỉ thay thế',
                    );
                }
                }

                // 7. Transaction thành công
                return {
                message: 'Xóa địa chỉ thành công',
                newDefaultAddressId:
                    replacementAddress
                    ? String(replacementAddress._id)
                    : null,
                };
            },
            );
        } catch (error) {
            if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000
            ) {
            throw new ConflictException(
                'Xung đột địa chỉ mặc định, vui lòng thử lại',
            );
            }

            throw error;
        }
    }



}
