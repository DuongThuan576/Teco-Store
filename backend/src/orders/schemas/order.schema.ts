import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types, Schema as MongooseSchema } from "mongoose";

export type OrderDocument = HydratedDocument<Order>;

//sản phẩm tại thời điểm đặt hàng
@Schema({_id:false})
export class OrderItem {
    @Prop({type: Types.ObjectId,required:true})
    productId: Types.ObjectId;

    @Prop({type: Types.ObjectId,required:true})
    variantId: Types.ObjectId;

    @Prop({required:true})
    productName:string;

    @Prop({required:true})
    variantName:string;

    @Prop({required:true})
    sku: string;

    @Prop({required:true, min: 0})
    unitPrice: number;

    @Prop({required:true, min: 1})
    quantity: number;

    @Prop({required:true, min: 0})
    subtotal: number;

}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

//địa chỉ giao hàng tại checkout
@Schema({_id:false})
export class  ShippingAddress {
    @Prop({ required: true})
    hoTenNguoiNhan:string;

    @Prop({ required: true})
    soDienThoai:string;

    @Prop({ required: true})
    tinhThanh:string;

    @Prop({ required: true})
    quanHuyen:string;

    @Prop({ required: true})
    phuongXa:string;

    @Prop({ required: true})
    diaChiChiTiet:string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

//Document Order
@Schema({
    timestamps: true,
    collection: 'orders'
})

export class Order {
    _id: Types.ObjectId;

    @Prop({required:true, unique:true})
    orderCode: string;

    @Prop({type: Types.ObjectId, required:true})
    userId:Types.ObjectId;

    @Prop({
        type:[OrderItemSchema],
        required:true
    })
    items: OrderItem[]

    @Prop({
        type: ShippingAddressSchema,
        required: true
    })
    shippingAddress: ShippingAddress;

    @Prop({type: MongooseSchema.Types.ObjectId, ref:'Voucher' ,default:null})
    voucherId?: Types.ObjectId|null;

    @Prop({type:String, default: null})
    voucherCode?: string | null;

    @Prop({required:true,min:0})
    subtotal: number;

    @Prop({type: Number, required:true, default: 0, min:0})
    discountAmount: number

    @Prop({ required : true, min:0})
    totalAmount:number;

    @Prop({
        type:String,
        enum:['cod','vnpay'],
        required:true
    })
    paymentMethod: string;

    @Prop({
        type:String,
        enum: ['pending','paid','failed','refunded'],
        default: 'pending'
    })
    paymentStatus:string;

    @Prop({
        type:String,
        enum: ['cho_xac_nhan',
            'da_xac_nhan',
            'dang_giao',
            'da_giao',
            'da_huy'
        ],
        default:'cho_xac_nhan',
    })
    orderStatus:string;

    @Prop({ type:String, default:''})
    note:string
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({
    userId: 1,
    createdAt: -1,
});