
import {
    Get,
    Delete,
    Patch,
    Param,
    Controller,
    Post,
    Body,
    Req,
    UseGuards,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './create-review.dto';
import { UpdateReviewDto } from './update-review.dto';
import { ModerateReviewDto } from './moderate-review.dto';
import { ReplyReviewDto } from './reply-review.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import type {
  AuthenticatedRequest,
} from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
  ) {}

  //Review
  @Post()
  @UseGuards(JwtAuthGuard)
  createReview(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateReviewDto,
  ) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập',
      );
    }

    // Kiểm tra role tạm thời trước khi triển khai PBAC
    if (user.role !== 'customer') {
      throw new ForbiddenException(
        'Chỉ Customer được đánh giá sản phẩm',
      );
    }

    return this.reviewsService.createReview(
      user.id,
      dto,
    );
  }


    @Get('product/:productId')
    getProductReviews(
        @Param('productId') productId: string,
    ) {
        return this.reviewsService.getProductReviews(
            productId,
        );
    }

    //xem review của mình( user)
    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMyReviews(
        @Req() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        if (user.role !== 'customer') {
            throw new ForbiddenException(
                'Chỉ Customer được xem đánh giá của mình',
            );
        }

        return this.reviewsService.getMyReviews(user.id);
    }  

    //Cập nhật review
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    updateReview(
        @Req() req: AuthenticatedRequest,
        @Param('id') reviewId: string,
        @Body() dto: UpdateReviewDto,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
                'Vui lòng đăng nhập',
            );
        }

        if (user.role !== 'customer') {
            throw new ForbiddenException(
                'Chỉ Customer được sửa đánh giá',
            );
        }

        return this.reviewsService.updateReview(
            user.id,
            reviewId,
            dto,
        );
    }

    //Xem danh sách review(admin)
    @Get('manage')
    @UseGuards(JwtAuthGuard)
    getReviewsForModeration(
        @Req() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        if (
            user.role !== 'admin' &&
            user.role !== 'employee'
        ) {
            throw new ForbiddenException(
            'Bạn không có quyền quản lý đánh giá',
            );
        }

        return this.reviewsService
            .getReviewsForModeration();
    }

    //Ẩn hiện review
    @Patch(':id/moderation')
    @UseGuards(JwtAuthGuard)
    moderateReview(
        @Req() req: AuthenticatedRequest,
        @Param('id') reviewId: string,
        @Body() dto: ModerateReviewDto,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        if (
            user.role !== 'admin' &&
            user.role !== 'employee'
        ) {
            throw new ForbiddenException(
            'Bạn không có quyền kiểm duyệt đánh giá',
            );
        }

        return this.reviewsService.moderateReview(
            reviewId,
            dto,
        );
    }


    //Phản hồi review của admin        
    @Post(':id/reply')
    @UseGuards(JwtAuthGuard)
    replyToReview(
        @Req() req: AuthenticatedRequest,
        @Param('id') reviewId: string,
        @Body() dto: ReplyReviewDto,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        if (
            user.role !== 'admin' &&
            user.role !== 'employee'
        ) {
            throw new ForbiddenException(
            'Bạn không có quyền phản hồi đánh giá',
            );
        }

        return this.reviewsService.replyToReview(
            user.id,
            reviewId,
            dto,
        );
    }

    //Xóa review (user)
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    deleteReview(
        @Req() req: AuthenticatedRequest,
        @Param('id') reviewId: string,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        if (user.role !== 'customer') {
            throw new ForbiddenException(
            'Chỉ Customer được xóa đánh giá của mình',
            );
        }

        return this.reviewsService.deleteReview(
            user.id,
            reviewId,
        );
    }

}
