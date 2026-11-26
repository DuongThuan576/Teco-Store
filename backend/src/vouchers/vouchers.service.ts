import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types, isValidObjectId } from 'mongoose';
import { ClientSession } from 'mongoose';

import {
  Voucher,
  DiscountType,
} from './schemas/voucher.schema';

import { CreateVoucherDto } from './create-voucher.dto';
import { VoucherUsage, VoucherUsageStatus,} from './schemas/voucher-usage.schema';
import { UpdateVoucherDto } from './update-voucher.dto';
import { Cart } from '../carts/schemas/cart.schema';
import { Product } from '../products/schemas/product.schema';
import { ValidateVoucherDto } from './validate-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<Voucher>,

    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,

    @InjectModel(VoucherUsage.name)
    private readonly voucherUsageModel: Model<VoucherUsage>,
  ) {}

    async createVoucher(dto: CreateVoucherDto) {
        // 1. Chuẩn hóa mã voucher
        const code = dto.code.trim().toUpperCase();

        // 2. Kiểm tra thời gian
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (
        !Number.isFinite(startDate.getTime()) ||
        !Number.isFinite(endDate.getTime()) ||
        startDate >= endDate
        ) {
        throw new BadRequestException(
            'Thời gian bắt đầu phải trước thời gian kết thúc',
        );
        }

        // 3. Kiểm tra giá trị giảm theo loại
        if (dto.discountType === DiscountType.PERCENTAGE) {
        if (dto.discountValue > 100) {
            throw new BadRequestException(
            'Phần trăm giảm giá không được vượt quá 100%',
            );
        }
        }

        if (
        dto.discountType === DiscountType.FIXED &&
        dto.maxDiscountAmount !== undefined
        ) {
        throw new BadRequestException(
            'Voucher giảm tiền cố định không cần maxDiscountAmount',
        );
        }

        // 4. Kiểm tra giới hạn sử dụng
        if (dto.usageLimitPerUser > dto.usageLimit) {
        throw new BadRequestException(
            'Giới hạn mỗi User không được vượt tổng lượt sử dụng',
        );
        }

        // 5. Tạo voucher
        try {
        const voucher = await this.voucherModel.create({
            code,
            discountType: dto.discountType,
            discountValue: dto.discountValue,
            minOrderAmount: dto.minOrderAmount,
            maxDiscountAmount: dto.maxDiscountAmount ?? null,
            usageLimit: dto.usageLimit,
            usageLimitPerUser: dto.usageLimitPerUser,
            usedCount: 0,
            startDate,
            endDate,
            isActive: dto.isActive ?? true,
        });

        return {
            message: 'Tạo voucher thành công',
            voucher,
        };
        } catch (error: unknown) {
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000
        ) {
            throw new ConflictException(
            'Mã voucher đã tồn tại',
            );
        }

        throw error;
        }
    }


    async getAllVouchers() {
        return this.voucherModel
            .find()
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()
            .exec();
    }


    async getVoucherDetail(voucherId: string) {
        // 1. Kiểm tra ObjectId
        if (!isValidObjectId(voucherId)) {
            throw new BadRequestException(
            'Voucher ID không hợp lệ',
            );
        }

        // 2. Tìm Voucher theo ID
        const voucher = await this.voucherModel
            .findById(new Types.ObjectId(voucherId))
            .lean()
            .exec();

        // 3. Không tìm thấy
        if (!voucher) {
            throw new NotFoundException(
                'Không tìm thấy voucher',
            );
        }

        return voucher;
    }

    async getMyWallet(userId: string) {
        // 1. Kiểm tra User ID
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }

        const userObjectId = new Types.ObjectId(userId);
        const now = new Date();

        // 2. Lấy Voucher còn hiệu lực
        const vouchers = await this.voucherModel
            .find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gt: now },
            $expr: {
                $lt: ['$usedCount', '$usageLimit'],
            },
            })
            .sort({ endDate: 1 })
            .select(
                'code discountType discountValue ' +
                'minOrderAmount maxDiscountAmount ' +
                'usageLimit usageLimitPerUser ' +
                'usedCount startDate endDate',
            )
            .lean()
            .exec();

        // 3. Không có Voucher khả dụng
        if (vouchers.length === 0) {
            return {
            total: 0,
            vouchers: [],
            };
        }

        const voucherIds = vouchers.map(
            (voucher) => voucher._id,
        );

        // 4. Đếm lượt đã dùng của Customer
        const usages = await this.voucherUsageModel
                .aggregate<{
                _id: Types.ObjectId;
                usedCount: number;
            }>([
                {
                    $match: {
                        userId: userObjectId,
                        voucherId: { $in: voucherIds },
                        status: VoucherUsageStatus.USED,
                    },
                },
                {
                    $group: {
                    _id: '$voucherId',
                    usedCount: { $sum: 1 },
                    },
                },
            ])
            .exec();

        // 5. Tạo Map để tra số lượt nhanh
        const usageMap = new Map<string, number>();

        for (const usage of usages) {
                usageMap.set(
                String(usage._id),
                usage.usedCount,
            );
        }

        // 6. Tính lượt còn lại và lọc Voucher
        const availableVouchers = vouchers
            .map((voucher) => {
            const usedByUser =
                usageMap.get(String(voucher._id)) ?? 0;

            const remainingForUser = Math.max(
                    0,
                    voucher.usageLimitPerUser - usedByUser,
                );

            const remainingGlobal = Math.max(
                    0,
                    voucher.usageLimit - voucher.usedCount,
                );

            const remainingUses = Math.min(
                remainingForUser,
                remainingGlobal,
            );

            return {
                ...voucher,
                usedByUser,
                remainingUses,
            };
            })
            .filter((voucher) => voucher.remainingUses > 0);

        // 7. Trả danh sách
        return {
            total: availableVouchers.length,
            vouchers: availableVouchers,
        };
    }


    async updateVoucher(
        voucherId: string,
        dto: UpdateVoucherDto,
    ) {
        // 1. Kiểm tra ID
        if (!isValidObjectId(voucherId)) {
            throw new BadRequestException(
                'Voucher ID không hợp lệ',
            );
        }

        // 2. Không nhận body rỗng
        if (Object.keys(dto).length === 0) {
            throw new BadRequestException(
                'Không có dữ liệu cần cập nhật',
            );
        }

        const objectId = new Types.ObjectId(voucherId);

        // 3. Đọc Voucher hiện tại
        const current = await this.voucherModel
            .findById(objectId)
            .lean()
            .exec();

        if (!current) {
            throw new NotFoundException(
                'Không tìm thấy voucher',
            );
        }

        const hasBeenUsed = current.usedCount > 0;

        // 4. Chuẩn hóa và tạo dữ liệu cập nhật
        const updates: Record<string, unknown> = {};

        if (dto.code !== undefined) {
            updates.code = dto.code.trim().toUpperCase();
        }

        if (dto.discountType !== undefined) {
            updates.discountType = dto.discountType;
        }

        if (dto.discountValue !== undefined) {
            updates.discountValue = dto.discountValue;
        }

        if (dto.minOrderAmount !== undefined) {
            updates.minOrderAmount = dto.minOrderAmount;
        }

        if (dto.maxDiscountAmount !== undefined) {
            updates.maxDiscountAmount = dto.maxDiscountAmount;
        }

        if (dto.usageLimit !== undefined) {
            updates.usageLimit = dto.usageLimit;
        }

        if (dto.usageLimitPerUser !== undefined) {
            updates.usageLimitPerUser = dto.usageLimitPerUser;
        }

        if (dto.startDate !== undefined) {
            updates.startDate = new Date(dto.startDate);
        }

        if (dto.endDate !== undefined) {
            updates.endDate = new Date(dto.endDate);
        }

        if (dto.isActive !== undefined) {
            updates.isActive = dto.isActive;
        }

        // 5. Kiểm tra những trường bị khóa
        if (hasBeenUsed) {
            const lockedFields = [
                'code',
                'discountType',
                'discountValue',
                'minOrderAmount',
                'maxDiscountAmount',
                'usageLimitPerUser',
                'startDate',
            ] as const;

            for (const field of lockedFields) {
                if (updates[field] !== undefined) {
                    throw new BadRequestException(
                        `Không được sửa ${field} khi voucher đã được sử dụng`,
                    );
                }
            }

            if (
                dto.usageLimit !== undefined &&
                dto.usageLimit < current.usageLimit
            ) {
            throw new BadRequestException(
                    'Voucher đã được dùng chỉ được tăng usageLimit',
                );
            }

            if (
                dto.endDate !== undefined &&
                new Date(dto.endDate) < new Date(current.endDate)
            ) {
            throw new BadRequestException(
                    'Voucher đã được dùng chỉ được gia hạn endDate',
                );
            }
        }

        // 6. Xác định trạng thái sau khi cập nhật
        const nextType =
            dto.discountType ?? current.discountType;

        const nextValue =
            dto.discountValue ?? current.discountValue;

        const nextUsageLimit =
            dto.usageLimit ?? current.usageLimit;

        const nextPerUserLimit =
            dto.usageLimitPerUser ?? current.usageLimitPerUser;

        const nextStartDate =
            dto.startDate
            ? new Date(dto.startDate)
            : new Date(current.startDate);

        const nextEndDate =
            dto.endDate
            ? new Date(dto.endDate)
            : new Date(current.endDate);

        // 7. Validation nghiệp vụ
        if (nextStartDate >= nextEndDate) {
            throw new BadRequestException(
                'Ngày kết thúc phải sau ngày bắt đầu',
            );
        }

        if (
            !Number.isFinite(nextValue) ||
            nextValue <= 0
        ) {
            throw new BadRequestException(
                'Giá trị giảm phải lớn hơn 0',
            );
        }

        if (
            nextType === DiscountType.PERCENTAGE &&
            nextValue > 100
        ) {
            throw new BadRequestException(
                'Phần trăm giảm không được vượt 100%',
            );
        }

        if (
            nextType === DiscountType.FIXED &&
            !Number.isInteger(nextValue)
        ) {
            throw new BadRequestException(
                'Số tiền giảm cố định phải là số nguyên',
            );
        }

        if (
            nextPerUserLimit > nextUsageLimit
        ) {
            throw new BadRequestException(
                'Giới hạn mỗi User không được vượt tổng lượt',
            );
        }

        if (nextUsageLimit < current.usedCount) {
            throw new BadRequestException(
                'Tổng giới hạn không được nhỏ hơn số lượt đã dùng',
            );
        }

        // 8. Kiểm tra maxDiscountAmount
        if (nextType === DiscountType.FIXED) {
            if (dto.maxDiscountAmount !== undefined) {
                throw new BadRequestException(
                    'Voucher fixed không cần maxDiscountAmount',
                );
            }

            // Xóa giới hạn cũ nếu đổi percentage -> fixed
            if (!hasBeenUsed) {
                updates.maxDiscountAmount = null;
            }
        } else {
            const maxDiscount =
            dto.maxDiscountAmount ??
            current.maxDiscountAmount;

            if (
                maxDiscount !== null &&
                maxDiscount !== undefined &&
                maxDiscount <= 0
            ) {
            throw new BadRequestException(
                    'Mức giảm tối đa phải lớn hơn 0',
                );
            }
        }

        // 9. Cập nhật có kiểm tra usedCount
        try {
            const updated = await this.voucherModel
            .findOneAndUpdate(
                {
                    _id: objectId,
                    usedCount: current.usedCount,
                },
                {
                    $set: updates,
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                },
            )
            .lean()
            .exec();

            if (!updated) {
            throw new ConflictException(
                    'Voucher đã thay đổi, vui lòng tải lại',
                );
            }

            return {
                message: 'Cập nhật voucher thành công',
                voucher: updated,
            };
        } catch (error: unknown) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 11000
            ) {
            throw new ConflictException(
                'Mã voucher đã tồn tại',
            );
            }

            throw error;
        }
    }


    private async calculateCartSubtotal(
        userId: Types.ObjectId,
    ): Promise<number> {
        // 1. Lấy Cart của Customer
        const cart = await this.cartModel
            .findOne({ userId })
            .lean()
            .exec();

        if (!cart || cart.items.length === 0) {
            throw new BadRequestException(
                'Giỏ hàng đang trống',
            );
        }

        let subtotal = 0;

        // 2. Duyệt từng sản phẩm trong Cart
        for (const item of cart.items) {
            if (
                !Number.isInteger(item.quantity) ||
                item.quantity <= 0
            ) {
            throw new BadRequestException(
                    'Số lượng sản phẩm không hợp lệ',
                );
            }

            // 3. Tìm Product từ MongoDB
            const product = await this.productModel
                .findById(item.productId)
                .lean()
                .exec();

            if (!product || product.isActive === false) {
            throw new BadRequestException(
                    'Sản phẩm không còn khả dụng',
                );
            }

            // 4. Tìm đúng Variant
            const variant = product.variants.find(
            (v) =>
                String(v._id) === String(item.variantId),
            );

            if (!variant) {
            throw new BadRequestException(
                    'Phân loại sản phẩm không tồn tại',
                );
            }

            // 5. Kiểm tra số lượng tồn kho
            if (variant.stock < item.quantity) {
            throw new BadRequestException(
                    'Số lượng trong kho không đủ',
                );
            }

            // 6. Tính thành tiền
            subtotal += variant.price * item.quantity;
        }

        return subtotal;
    }


    async validateVoucher(
        userId: string,
        dto: ValidateVoucherDto,
    ) {
        // 1. Kiểm tra User ID
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
                'User ID không hợp lệ',
            );
        }

        const userObjectId = new Types.ObjectId(userId);
        const code = dto.code.trim().toUpperCase();
        const now = new Date();

        // 2. Tính tổng tiền từ Cart
        const subtotal = await this.calculateCartSubtotal(
            userObjectId,
        );

        // 3. Tìm Voucher
        const voucher = await this.voucherModel
            .findOne({ code })
            .lean()
            .exec();

        if (!voucher) {
            throw new BadRequestException(
                'Mã giảm giá không tồn tại',
            );
        }

        // 4. Kiểm tra trạng thái
        if (!voucher.isActive) {
            throw new BadRequestException(
                'Voucher đã bị vô hiệu hóa',
            );
        }

        // 5. Kiểm tra thời gian
        if (
            now < new Date(voucher.startDate) ||
            now >= new Date(voucher.endDate)
        ) {
            throw new BadRequestException(
                'Voucher chưa có hiệu lực hoặc đã hết hạn',
            );
        }

        // 6. Kiểm tra tổng lượt
        if (voucher.usedCount >= voucher.usageLimit) {
            throw new BadRequestException(
                'Voucher đã hết lượt sử dụng',
            );
        }

        // 7. Kiểm tra lượt sử dụng của Customer
        const usedByUser =
                await this.voucherUsageModel.countDocuments({
                userId: userObjectId,
                voucherId: voucher._id,
                status: VoucherUsageStatus.USED,
            });

        if (usedByUser >= voucher.usageLimitPerUser) {
            throw new BadRequestException(
                'Bạn đã sử dụng hết lượt của voucher này',
            );
        }

        // 8. Kiểm tra giá trị đơn tối thiểu
        if (subtotal < voucher.minOrderAmount) {
            throw new BadRequestException(
                `Đơn hàng phải từ ${voucher.minOrderAmount}đ`,
            );
        }

        // 9. Tính số tiền được giảm
        let discountAmount = 0;

        if (voucher.discountType === DiscountType.FIXED) {
            discountAmount = voucher.discountValue;
        } else if (
            voucher.discountType === DiscountType.PERCENTAGE
        ) {
            discountAmount = Math.floor(
                subtotal * voucher.discountValue / 100,
            );

            if (voucher.maxDiscountAmount != null) {
                    discountAmount = Math.min(
                    discountAmount,
                    voucher.maxDiscountAmount,
                );
            }
        }

        // 10. Không giảm quá tổng giá trị hàng hóa
        discountAmount = Math.min(
            subtotal,
            discountAmount,
        );

        const totalAmount = subtotal - discountAmount;

        // 11. Trả kết quả dự kiến
        return {
            valid: true,
            voucher: {
            id: voucher._id,
            code: voucher.code,
            discountType: voucher.discountType,
            discountValue: voucher.discountValue,
            },
            subtotal,
            discountAmount,
            totalAmount,
            remainingUses: Math.min(
            voucher.usageLimitPerUser - usedByUser,
            voucher.usageLimit - voucher.usedCount,
            ),
        };
    }


    async reserveVoucherForOrder(
        userId: Types.ObjectId,
        voucherCode: string,
        subtotal: number,
        session: ClientSession,
    ) {
        // 1. Chuẩn hóa code
        const code = voucherCode.trim().toUpperCase();
        const now = new Date();

        if (!Number.isSafeInteger(subtotal) || subtotal <= 0) {
            throw new BadRequestException(
            'Tổng tiền đơn hàng không hợp lệ',
            );
        }

        // 2. Tìm voucher còn hiệu lực
        const voucher = await this.voucherModel
            .findOne({
            code,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gt: now },
            })
            .session(session)
            .lean()
            .exec();

        if (!voucher) {
            throw new BadRequestException(
            'Voucher không tồn tại hoặc không còn hiệu lực',
            );
        }

        // 3. Kiểm tra giá trị đơn tối thiểu
        if (subtotal < voucher.minOrderAmount) {
            throw new BadRequestException(
            'Đơn hàng chưa đạt giá trị tối thiểu của voucher',
            );
        }

        // 4. Kiểm tra số lượt Customer đã sử dụng
        const usedByUser = await this.voucherUsageModel
            .countDocuments({
            voucherId: voucher._id,
            userId,
            status: VoucherUsageStatus.USED,
            })
            .session(session)
            .exec();

        if (usedByUser >= voucher.usageLimitPerUser) {
            throw new BadRequestException(
            'Bạn đã sử dụng hết lượt của voucher này',
            );
        }

        // 5. Tính tiền giảm
        let discountAmount: number;

        if (voucher.discountType === DiscountType.FIXED) {
            discountAmount = voucher.discountValue;
        } else if (
            voucher.discountType === DiscountType.PERCENTAGE
        ) {
            discountAmount = Math.floor(
            subtotal * voucher.discountValue / 100,
            );

            if (voucher.maxDiscountAmount != null) {
            discountAmount = Math.min(
                discountAmount,
                voucher.maxDiscountAmount,
            );
            }
        } else {
            throw new BadRequestException(
            'Loại voucher không hợp lệ',
            );
        }

        discountAmount = Math.min(
            subtotal,
            discountAmount,
        );

        if (
            !Number.isSafeInteger(discountAmount) ||
            discountAmount < 0
        ) {
            throw new BadRequestException(
            'Số tiền giảm không hợp lệ',
            );
        }

        // 6. Tăng lượt sử dụng có điều kiện
        const result = await this.voucherModel.updateOne(
            {
                _id: voucher._id,
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gt: now },
                $expr: {
                    $lt: ['$usedCount', '$usageLimit'],
                },
            },
            {
                $inc: {
                    usedCount: 1,
                },
            },
            { session },
        );

        if (result.modifiedCount !== 1) {
            throw new BadRequestException(
                'Voucher đã hết lượt hoặc không còn hiệu lực',
            );
        }

        // 7. Trả thông tin để OrdersService tạo Order
        return {
            voucherId: voucher._id,
            voucherCode: voucher.code,
            discountAmount,
        };
    }


    async createVoucherUsage(
        voucherId: Types.ObjectId,
        userId: Types.ObjectId,
        orderId: Types.ObjectId,
        discountAmount: number,
        session: ClientSession,
    ) {
        const [usage] = await this.voucherUsageModel.create(
            [
                {
                    voucherId,
                    userId,
                    orderId,
                    discountAmount,
                    status: VoucherUsageStatus.USED,
                    usedAt: new Date(),
                },
            ],
            { session },
        );

        return usage;
    }


    async reverseVoucherUsage(
        orderId: Types.ObjectId,
        userId: Types.ObjectId,
        voucherId: Types.ObjectId,
        session: ClientSession,
    ) {
        // 1. Chỉ chuyển lượt đang USED thành REVERSED
        const usage = await this.voucherUsageModel
            .findOneAndUpdate(
            {
                orderId,
                userId,
                voucherId,
                status: VoucherUsageStatus.USED,
            },
            {
                $set: {
                status: VoucherUsageStatus.REVERSED,
                },
            },
            {
                session,
                returnDocument: 'after',
            },
            )
            .exec();

        if (!usage) {
            throw new ConflictException(
            'Không tìm thấy lượt Voucher có thể hoàn',
            );
        }

        // 2. Hoàn lại một lượt sử dụng toàn hệ thống
        const result = await this.voucherModel.updateOne(
            {
            _id: voucherId,
            usedCount: { $gte: 1 },
            },
            {
            $inc: { usedCount: -1 },
            },
            { session },
        );

        if (result.modifiedCount !== 1) {
            throw new ConflictException(
            'Không thể hoàn lượt Voucher',
            );
        }

        return usage;
    }






}
