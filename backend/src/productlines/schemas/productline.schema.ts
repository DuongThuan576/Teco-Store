import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({
    collection:'productLines',
    timestamps: true
})

export class ProductLine{
    @Prop({required:true, trim:true})
    name:string;

    @Prop({required:true, trim:true})
    slug:string;

    @Prop({type:Types.ObjectId, required:true, ref: 'Brand'})
    brandId:Types.ObjectId;

    @Prop({type:Types.ObjectId, required:true, ref: 'Category'})
    categoryId:Types.ObjectId;

    @Prop({type:Types.ObjectId, default:null, ref: 'ProductLine'})
    parentId:Types.ObjectId | null;

    @Prop({
        type: String,
        enum:['active','inactive'],
        default:'active'
    })
    status:string;

    createdAt?:Date;
    updatedAt?:Date;
}

export const ProductLineSchema = SchemaFactory.createForClass(ProductLine);

ProductLineSchema.index(
    {slug:1},
    {
        unique:true,
        name:'unique_product_line_slug',
    },
);