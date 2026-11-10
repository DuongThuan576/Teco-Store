import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

import { Category, CategorySchema } from './schemas/category.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/schemas/product.schema';

import { ProductLine, ProductLineSchema } from '../productlines/schemas/productline.schema';

@Module({
    imports:[
        MongooseModule.forFeature([
            {
                name: Category.name,
                schema: CategorySchema
            },
            {
                name: Product.name,
                schema: ProductSchema,
            },
                        {
                name: ProductLine.name,
                schema: ProductLineSchema,
            }
        ]),
    ],
  controllers: [CategoriesController],
  providers: [CategoriesService]
})
export class CategoriesModule {}
