import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AuthSessionDocument = HydratedDocument<AuthSession>

@Schema({
    collection: 'authSessions',
    timestamps: true
})

export class AuthSession {
    @Prop({type: Types.ObjectId, ref: 'User', required:true})
    userId: Types.ObjectId

    @Prop({type : String , required: true, select: false})
    tokenHash: string

    @Prop({type: Date, required:true})
    expiresAt: Date

    @Prop({type:Date, default: null})
    revokedAt: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);

// Index tìm phiên theo User
AuthSessionSchema.index({ userId: 1 });

// TTL Index tự xóa phiên khi hết hạn
AuthSessionSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    name: 'auth_session_expiry_ttl',
  },
);