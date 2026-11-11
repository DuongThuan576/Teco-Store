import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { UserRole } from "../user-role.enum";

export type UserDocument = HydratedDocument<User>;

@Schema({
    collection: 'users',
    timestamps: true,
})

export class User {
    @Prop({required:true, trim:true})
    fullName:string;

    @Prop({required:true, trim:true, lowercase:true})
    email:string;

    @Prop({required:true, trim:true, select:false})
    password:string;

    @Prop({type: String ,default:'', trim:true})
    phone:string;

    @Prop({type:String, enum:Object.values(UserRole), default: UserRole.CUSTOMER})
    role:UserRole;

    @Prop({type:String, enum:['active','inactive'], default:'active'})
    status:string;

    createdAt?:Date;
    updatedAt?:Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
    { email: 1},
    {
        unique: true,
        name:'unique_user_email',
    },
);