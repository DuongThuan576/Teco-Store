import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import { Review } from './schemas/review.schema';
import { Order } from '../orders/schemas/order.schema';
import { CreateReviewDto } from './create-review.dto';
import { UpdateReviewDto } from './update-review.dto';
import { ModerateReviewDto } from './moderate-review.dto';
import { ReplyReviewDto } from './reply-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<Review>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async createReview(
    userId: string,
    dto: CreateReviewDto,
  ) {
    // Bước 1: Kiểm tra User ID
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        'User ID không hợp lệ',
      );
    }

    const userObjectId = new Types.ObjectId(userId);
    const orderObjectId = new Types.ObjectId(dto.orderId);
    const productObjectId = new Types.ObjectId(dto.productId);

    // Bước 2: Tìm Order thuộc đúng Customer
    const order = await this.orderModel
      .findOne({
        _id: orderObjectId,
        userId: userObjectId,
      })
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng',
      );
    }

    // Bước 3: Chỉ cho đánh giá khi đã giao hàng
    if (order.orderStatus !== 'da_giao') {
      throw new ForbiddenException(
        'Chỉ được đánh giá sau khi nhận hàng',
      );
    }

    // Bước 4: Kiểm tra Product có trong Order
    const purchased = order.items.some(
      (item) =>
        String(item.productId) === dto.productId,
    );

    if (!purchased) {
      throw new BadRequestException(
        'Sản phẩm không thuộc đơn hàng này',
      );
    }

    // Bước 5: Kiểm tra Review đã tồn tại
    const existingReview = await this.reviewModel
      .findOne({
        userId: userObjectId,
        orderId: orderObjectId,
        productId: productObjectId,
        parentId: null,
      })
      .lean()
      .exec();

    if (existingReview) {
      throw new ConflictException(
        'Bạn đã đánh giá sản phẩm trong đơn hàng này',
      );
    }

    // Bước 6: Tạo Review
    try {
      const review = await this.reviewModel.create({
        userId: userObjectId,
        orderId: orderObjectId,
        productId: productObjectId,
        rating: dto.rating,
        comment: dto.comment.trim(),
        parentId: null,
        isHidden: false,
      });

      return {
        message: 'Đánh giá sản phẩm thành công',
        review,
      };
    } catch (error: unknown) {
      // Unique Index chặn hai request tạo Review trùng
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException(
          'Bạn đã đánh giá sản phẩm trong đơn hàng này',
        );
      }

      throw error;
    }
  }


    async getProductReviews(productId: string) {
        //Kiểm tra Product ID
        if (!isValidObjectId(productId)) {
            throw new BadRequestException(
            'Product ID không hợp lệ',
            );
        }

        const productObjectId = new Types.ObjectId(productId);

        //Lấy các Review công khai của sản phẩm
        const reviews = await this.reviewModel
            .find({
            productId: productObjectId,
            parentId: null,
            isHidden: false,
            })
            .select(
                'userId productId rating comment createdAt updatedAt',
            )
            .sort({ createdAt: -1 }) //
            .limit(20)
            .lean()
            .exec();

        const reviewIds = reviews.map((review) => review._id);

        //Lấy phản hồi công khai của Shop
        const replies = await this.reviewModel
            .find({
                parentId: { $in: reviewIds },
                productId: productObjectId,
                isHidden: false,
            })
            .select(
                'userId parentId comment createdAt updatedAt',
            )
            .lean()
            .exec();

        //Nhóm Reply theo Review gốc
        const replyMap = new Map<string, typeof replies>();

        for (const reply of replies) {
            const key = String(reply.parentId);
            const current = replyMap.get(key) ?? [];

            current.push(reply);
            replyMap.set(key, current);
        }

        //Gắn Reply vào Review
        const result = reviews.map((review) => ({
            ...review,
            replies: replyMap.get(String(review._id)) ?? [],
        }));

        // Trả dữ liệu
        return {
            productId,
            total: result.length,
            reviews: result,
        };
    }


    async getMyReviews(userId: string) {
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
                'User ID không hợp lệ',
            );
        }

        return this.reviewModel
            .find({
            userId: new Types.ObjectId(userId),
            parentId: null,
            })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
    }


    async updateReview(
        userId: string,
        reviewId: string,
        dto: UpdateReviewDto,
        ) {
        // 1. Kiểm tra ObjectId
        if (
            !isValidObjectId(userId) ||
            !isValidObjectId(reviewId)
        ) {
            throw new BadRequestException(
            'User ID hoặc Review ID không hợp lệ',
            );
        }

        // 2. Chỉ nhận trường được phép cập nhật
        const updateData: {
            rating?: number;
            comment?: string;
        } = {};

        if (dto.rating !== undefined) {
            if (
            !Number.isInteger(dto.rating) ||
            dto.rating < 1 ||
            dto.rating > 5
            ) {
            throw new BadRequestException(
                'Rating phải là số nguyên từ 1 đến 5',
            );
            }

            updateData.rating = dto.rating;
        }

        if (dto.comment !== undefined) {
            if (typeof dto.comment !== 'string') {
            throw new BadRequestException(
                'Comment phải là chuỗi',
            );
            }

            const comment = dto.comment.trim();

            if (!comment || comment.length > 1000) {
            throw new BadRequestException(
                'Comment phải có từ 1 đến 1000 ký tự',
            );
            }

            updateData.comment = comment;
        }

        // 3. Không chấp nhận request không có gì để sửa
        if (Object.keys(updateData).length === 0) {
            throw new BadRequestException(
            'Không có dữ liệu cần cập nhật',
            );
        }

        // 4. Cập nhật đúng Review của Customer
        const updatedReview = await this.reviewModel
            .findOneAndUpdate(
            {
                _id: new Types.ObjectId(reviewId),
                userId: new Types.ObjectId(userId),
                parentId: null,
            },
            {
                $set: updateData,
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
            )
            .lean()
            .exec();

            if (!updatedReview) {
                throw new NotFoundException(
                'Không tìm thấy đánh giá của bạn',
                );
        }

        return {
            message: 'Cập nhật đánh giá thành công',
            review: updatedReview,
        };
    }


    async moderateReview(
        reviewId: string,
        dto: ModerateReviewDto,
    ) {
        // 1. Kiểm tra định dạng Review ID
        if (!isValidObjectId(reviewId)) {
            throw new BadRequestException(
                'Review ID không hợp lệ',
            );
        }

        // 2. Cập nhật trạng thái kiểm duyệt
        const review = await this.reviewModel
            .findOneAndUpdate(
            {
                _id: new Types.ObjectId(reviewId),
                parentId: null,
            },
            {
                $set: {
                    isHidden: dto.isHidden,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
            )
            .lean()
            .exec();

        // 3. Không tìm thấy Review gốc
        if (!review) {
            throw new NotFoundException(
                'Không tìm thấy đánh giá',
            );
        }

        // 4. Trả kết quả
        return {
            message: dto.isHidden
            ? 'Đã ẩn đánh giá'
            : 'Đã cho phép hiển thị đánh giá',
            review,
        };
    }


    async getReviewsForModeration() {
        return this.reviewModel
            .find({
            parentId: null,
            })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()
            .exec();
    }

    
    
    async replyToReview(
        staffId: string,
        reviewId: string,
        dto: ReplyReviewDto,
    ) {
        // 1. Kiểm tra ID
        if (
            !isValidObjectId(staffId) ||
            !isValidObjectId(reviewId)
        ) {
            throw new BadRequestException(
            'Staff ID hoặc Review ID không hợp lệ',
            );
        }

        // 2. Kiểm tra nội dung Reply
        const comment = dto.comment?.trim();

        if (!comment || comment.length > 1000) {
            throw new BadRequestException(
            'Nội dung phản hồi phải có từ 1 đến 1000 ký tự',
            );
        }

        const reviewObjectId = new Types.ObjectId(reviewId);

        // 3. Tìm Review gốc đang công khai
        const parentReview = await this.reviewModel
            .findOne({
            _id: reviewObjectId,
            parentId: null,
            isHidden: false,
            })
            .lean()
            .exec();

        if (!parentReview) {
            throw new NotFoundException(
                'Không tìm thấy đánh giá có thể phản hồi',
            );
        }

        // 4. Tạo Reply
        try {
            const reply = await this.reviewModel.create({
                userId: new Types.ObjectId(staffId),
                productId: parentReview.productId,
                orderId: null,
                rating: null,
                comment,
                parentId: reviewObjectId,
                isHidden: false,
            });

            return {
                message: 'Phản hồi đánh giá thành công',
                reply,
            };
        } catch (error: unknown) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 11000
            ) {
            throw new ConflictException(
                    'Đánh giá này đã có phản hồi của Shop',
                );
            }

            throw error;
        }
    }


    async deleteReview(
        userId: string,
        reviewId: string,
    ) {
        // 1. Kiểm tra ObjectId
        if (
            !isValidObjectId(userId) ||
            !isValidObjectId(reviewId)
        ) {
            throw new BadRequestException(
            'User ID hoặc Review ID không hợp lệ',
            );
        }

        const userObjectId = new Types.ObjectId(userId);
        const reviewObjectId = new Types.ObjectId(reviewId);

        // 2. Bắt đầu Transaction
        return this.connection.transaction(async (session) => {

            // 3. Xóa đúng Review gốc thuộc Customer
            const result = await this.reviewModel.deleteOne(
                {
                    _id: reviewObjectId,
                    userId: userObjectId,
                    parentId: null,
                },
                { session },
            );

            if (result.deletedCount !== 1) {
            throw new NotFoundException(
                    'Không tìm thấy đánh giá của bạn',
                );
            }

            // 4. Xóa các phản hồi thuộc Review vừa xóa
            await this.reviewModel.deleteMany(
                {
                    parentId: reviewObjectId,
                },
                { session },
            );

            // 5. Chỉ trả kết quả sau khi callback hoàn tất
            return {
                message: 'Xóa đánh giá thành công',
            };
        });
    }


}
