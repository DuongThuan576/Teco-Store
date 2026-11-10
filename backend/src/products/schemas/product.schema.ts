import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;


@Schema({_id: true})
export class ProductVariant {
    _id?: Types.ObjectId;
    
    @Prop({required : true, trim: true})
    sku: string;

    @Prop()
    color?: string;

    @Prop()
    storage?: string;
    
    @Prop({ type : [String], default: [] })
    images: string[];

    @Prop({required : true, min: 0})
    price: number;

    @Prop({required: true, min: 0})
    stock: number;
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);



@Schema({
    collection: 'products',
    timestamps: true,
    strict: true,
})

export class Product {
    @Prop({required: true, trim: true})
    name?:string;

    @Prop({required: true, trim: true})
    slug?: string;

    @Prop({default: ''})
    description: string;

    @Prop({ type : [String], default: [] })
    images: string[];

    @Prop({ type: Boolean, default: true })
    isActive: boolean;  

    @Prop({type: Types.ObjectId})
    categoryId?: Types.ObjectId;

    @Prop({type: Types.ObjectId})
    brandId?: Types.ObjectId;

    @Prop({type: Types.ObjectId})
    productLineId?: Types.ObjectId;

    @Prop({type: SchemaTypes.Mixed})
    specifications?: Record<string,unknown>;

    @Prop({type: [ProductVariant], default: []})
    variants: ProductVariant[];

    createdAt?: Date;
    updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index(
    {slug:1},
    {unique: true, name :'unique_product_slug'}
)

ProductSchema.index(
    {'variants.sku':1},
    {unique:true, name: 'unique_product_sku'}
)