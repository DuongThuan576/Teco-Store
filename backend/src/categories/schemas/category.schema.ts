import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({
    collection:'categories',
    timestamps: true,
})

export class Category {

    @Prop({required:true, trim: true})
    name:string;

    @Prop({required:true, trim: true})
    slug:string;

    @Prop({required:true, trim: true})
    productType:string;

    @Prop({
        type: Types.ObjectId,
        default:null
    })
    parentId:Types.ObjectId | null;

    createdAt?:Date;
    updatedAt?:Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index(
    {slug: 1},
    {unique: true}
)