import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Review,
  ReviewSchema,
} from './schemas/review.schema';

import {
  Order,
  OrderSchema,
} from '../orders/schemas/order.schema';

import { AuthModule } from '../auth/auth.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
    imports: [
        AuthModule,
        MongooseModule.forFeature([
          {
            name: Review.name,
            schema: ReviewSchema,
          },
          {
            name: Order.name,
            schema: OrderSchema,
          },
        ]),
      ],
  controllers: [ReviewsController],
  providers: [ReviewsService]
})
export class ReviewsModule {}
