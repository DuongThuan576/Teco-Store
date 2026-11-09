import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({
    collection: 'products',
    timestamps: false,
    strict:false,
})

export class Product {
    @Prop()
    name?:string;

    @Prop()
    slug?: string;

    @Prop({type: Types.ObjectId})
    categoryId?: Types.ObjectId;

    @Prop({type: Types.ObjectId})
    brandId?: Types.ObjectId;

    @Prop({type: Types.ObjectId})
    productLineId?: Types.ObjectId;

    @Prop({type: Object})
    specifications?: Record<string,unknown>;

    @Prop({type: Object})
    variants?: Record<string,unknown>[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);