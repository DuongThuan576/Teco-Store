
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

import { PoliciesGuard } from '../auth/authorization/policies/guards/policies.guard';

import { CheckPolicies } from '../auth/authorization/policies/decorators/check-policies.decorator';

import { Action } from '../auth/authorization/enums/action.enum';

import { Subject } from '../auth/authorization/enums/subject.enum';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
  ) {}

    //Review
    @Post()
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Create,
        subject: Subject.Review,
    })
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

        return this.reviewsService.getMyReviews(req.user!);
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

        return this.reviewsService.updateReview(
            req.user!,
            reviewId,
            dto,
        );
    }

    //Xem danh sách review(admin)
    @Get('manage')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Read,
        subject: Subject.Review,
    })
    getReviewsForModeration(
        @Req() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException(
            'Vui lòng đăng nhập',
            );
        }

        return this.reviewsService
            .getReviewsForModeration();
    }

    //Ẩn hiện review
    @Patch(':id/moderation')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Moderate,
        subject: Subject.Review,
    })
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

        return this.reviewsService.moderateReview(
            reviewId,
            dto,
        );
    }


    //Phản hồi review của admin        
    @Post(':id/reply')
    @UseGuards(JwtAuthGuard, PoliciesGuard)
    @CheckPolicies({
        action: Action.Reply,
        subject: Subject.Review,
    })
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

        return this.reviewsService.deleteReview(
            req.user!,
            reviewId,
        );
    }

}
