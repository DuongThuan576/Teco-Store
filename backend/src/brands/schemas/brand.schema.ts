import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type BrandDocument = HydratedDocument<Brand>;

@Schema({
    collection: 'brands',
    timestamps: true,
})

export class Brand {
    @Prop({require:true, trim: true})
    name:string;

    @Prop({default:''})
    slug:string;

    @Prop({require:true, trim: true})
    logo:string;

    @Prop({
        enum:['active','inactive'],
        default: 'active',
    })
    status:string;

    createAt?:Date;
    updateAt?:Date;
}

export const BrandSchema = SchemaFactory.createForClass(Brand)


