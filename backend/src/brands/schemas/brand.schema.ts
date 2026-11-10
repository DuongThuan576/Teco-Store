import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type BrandDocument = HydratedDocument<Brand>;

@Schema({
    collection: 'brands',
    timestamps: true,
})

export class Brand {
    @Prop({required:true, trim: true})
    name:string;

    @Prop({required:true, trim: true})
    slug:string;

    @Prop({required:true, trim: true, default:''})
    logo:string;

    @Prop({
        enum:['active','inactive'],
        default: 'active',
    })
    status:string;

    createdAt?:Date;
    updatedAt?:Date;
}

export const BrandSchema = SchemaFactory.createForClass(Brand)

BrandSchema.index(
  { slug: 1 },
  {
    unique: true,
    name: 'unique_brand_slug',
  },
);


