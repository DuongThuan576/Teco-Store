import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';

import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, ClientSession, Connection } from 'mongoose';

import { CreateOrderDto } from './create-order.dto';
import { UpdateOrderStatusDto } from './update-order-status.dto';
import { PaymentMethod } from './enums/payment-method.enum';

import { Order } from './schemas/order.schema';
import { randomUUID } from 'node:crypto';

//Điều chỉnh đường dẫn import theo schema thực tế
import { Cart } from '../carts/schemas/cart.schema'
import { Address } from '../addresses/schemas/address.schema'
import { Product } from '../products/schemas/product.schema';
import { VouchersService } from '../vouchers/vouchers.service';
import { Payment, PaymentStatus } from '../payments/schemas/payment.schema';
import { randomBytes } from 'node:crypto';

import { subject } from '@casl/ability';

import { AbilityFactory } from '../auth/authorization/ability/ability.factory';
import { Action } from '../auth/authorization/enums/action.enum';
import { Subject } from '../auth/authorization/enums/subject.enum';

import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';

@Injectable()
export class OrdersService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(Cart.name)
        private readonly cartModel: Model<Cart>,

        @InjectModel(Address.name)
        private readonly addressModel: Model<Address>,

        @InjectModel(Product.name)
        private readonly productModel: Model<Product>,

        @InjectConnection()
        private readonly connection: Connection,

        private readonly vouchersService: VouchersService,

        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,

        private readonly abilityFactory: AbilityFactory,
    ){}

    async prepareOrder(
        userId : string,
        dto: CreateOrderDto,
        session ?: ClientSession,
    ){
        //hỗ trợ COD và VNPAY
        if (
            dto.paymentMethod !== PaymentMethod.COD &&
            dto.paymentMethod !== PaymentMethod.VNPAY
        ){
            throw new BadRequestException(
                'Phương thức thanh toán không được hỗ trợ',
            );
        }

        const userObjectId = new Types.ObjectId(userId)
        
        //Kiểm tra địa chỉ thuộc Customer
        const address = await this.addressModel.findOne({
            _id: new Types.ObjectId(dto.addressId),
            userId: userObjectId,
        }).session(session ?? null).lean();

        if (!address){
            throw new NotFoundException(
                'Không tìm thấy dịa chỉ giao hàng',
            );
        }

        //Lấy giỏ hàng 
        const cart = await this.cartModel.findOne({
            userId : userObjectId,
        }).session(session ?? null).lean();

        if (!cart || !cart.items?.length){
            throw new BadRequestException(
                'Giỏ hàng đang trống',
            );
        }

        //Lấy thông tin Product hiện tại
        const productIds = [
            ...new Set(
                cart.items.map((item) =>
                    String(item.productId),
                ),
            ),
        ];

        const products = await this.productModel.find ({
            _id: {
                $in: productIds.map(
                    (id) => new Types.ObjectId(id),
                ),
            },
        }).session(session ?? null).lean();

        const productMap = new Map(
            products.map((product) => [
                String(product._id),
                product,
            ]),
        );

        //Kiểm tra variant và chuẩn bị snapshot
        const OrderItems: Array<{
            productId: Types.ObjectId;
            variantId: Types.ObjectId;
            productName:string;
            variantName: string;
            sku: string;
            unitPrice: number;
            quantity: number;
            subtotal:number;
        }> = []

        const requestedQty = new Map<string, number>();

        for (const item of cart.items){
            const product = productMap.get(
                String(item.productId),
            );

            if (!product){
                throw new BadRequestException(
                    'Có sản phẩm trong giỏ không còn tồn tại',
                );
            }

            if (!product.isActive){
                throw new BadRequestException(
                    `${product.name} hiện đang ngừng kinh doanh`
                );
            }

            const variant = product.variants.find(
                (v) => String(v._id) === String(item.variantId)
            )

            if(!variant){
                throw new BadRequestException(
                    `Phiên bản của ${product.name} không tồn tại`
                )
            }

            if (!variant || !variant._id) {
                throw new BadRequestException(
                    'Phiên bản sản phẩm không hợp lệ',
                );
            }

            const quantity = item.quantity;
            const unitPrice = variant.price;

            if (
                !Number.isSafeInteger(quantity) ||
                quantity <= 0
            ){
                throw new BadRequestException(
                    'Số lượng sản phẩm không hợp lệ'
                );
            }

            if (
                !Number.isSafeInteger(unitPrice) ||
                unitPrice < 0
            ) {
                throw new BadRequestException(
                    'Giá sản phẩm không hợp lệ'
                );
            }

            const key = `${String(product._id)}:${String(variant._id)}`;

            const totalRequested = (requestedQty.get(key) ?? 0 ) + quantity;

            if (variant.stock < totalRequested){
                throw new BadRequestException(
                    `${product.name} không đủ tồn kho.`
                );
            }

            requestedQty.set(key, totalRequested);

            const itemSubtotal= unitPrice * quantity;

            if (!Number.isSafeInteger(itemSubtotal)){
                throw new BadRequestException(
                    'Tổng tiền sản phẩm không hợp lệ'
                );
            }

            OrderItems.push({
                productId: product._id ,
                variantId : variant._id,
                productName: product.name,
                variantName:
                    `${variant.color} - ${variant.storage}`,
                sku : variant.sku,
                unitPrice,
                quantity, 
                subtotal: itemSubtotal
            });
        }

        //tính tổng tiền bằng dữ liệu backend
        const subtotal = OrderItems.reduce(
            (sum, item) => sum + item.subtotal,
            0,
        )

        if (!Number.isSafeInteger(subtotal)){
            throw new BadRequestException(
                'Tổng tiền đơn hàng không hợp lệ'
            );
        }

        //Voucher sẽ được tích hợp sau
        const discountAmount = 0
        const totalAmount = subtotal - discountAmount;

        //Snapshot địa chỉ
        const shippingAddress = {
            hoTenNguoiNhan : address.receiverName,
            soDienThoai: address.phone,
            tinhThanh: address.province,
            quanHuyen: address.district,
            phuongXa: address.ward,
            diaChiChiTiet: address.address,
        }

        //trả dữ liệu chuẩn bị checkout
        return {
            userId: userObjectId,
            items: OrderItems,
            shippingAddress,
            subtotal,
            discountAmount,
            totalAmount,
            paymentMethod:dto.paymentMethod,
            note: dto.note ?? ''
        }
    }

    async createOrder(
        userId : string,
        dto : CreateOrderDto,
    ){
        if (!Types.ObjectId.isValid(userId)){
            throw new BadRequestException(
                'userId không hợp lệ'
            );
        }

        const userObjectId = new Types.ObjectId(userId);

        return this.connection.transaction(async(session)=>{
            //Chuẩn bị order trong transaction
            const prepared = await this.prepareOrder(
                userId,
                dto,
                session
            );

            //gộp số lượng variant trùng 
            const quantities = new Map<
                string,
                {
                    productId:Types.ObjectId;
                    variantId:Types.ObjectId;
                    quantity:number;
                }
            >();

            for (const item of prepared.items){
                const key = `${item.productId}:${item.variantId}`

                const existing = quantities.get(key);

                if(existing){
                    existing.quantity += item.quantity;
                }else{
                    quantities.set(key, {
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity
                    });
                }
            }

            //trừ tồn kho nguyên tử
            for (const item of quantities.values()){
                const result = await this.productModel.updateOne(
                    {
                        _id: item.productId,
                        isActive: true,
                        variants:{
                            $elemMatch:{
                                _id: item.variantId,
                                stock: {$gte: item.quantity}
                            },
                        },
                    },
                    {
                        $inc: {
                            'variants.$.stock': - item.quantity,
                        },
                    },
                    {session},
                );

                if (result.modifiedCount !== 1){
                    throw new BadRequestException(
                        'Sản phẩm không đủ hoặc đã ngừng bán'
                    );
                }
            }


            let voucherId: Types.ObjectId | null = null;
            let voucherCode: string | null = null;

            let discountAmount = 0;

            // Customer có gửi mã Voucher hay không?
            if (dto.voucherCode) {
                const voucherResult =
                    await this.vouchersService.reserveVoucherForOrder(
                        userObjectId,
                        dto.voucherCode,
                        prepared.subtotal,
                        session,
                    );

                voucherId = voucherResult.voucherId;
                voucherCode = voucherResult.voucherCode;
                discountAmount = voucherResult.discountAmount;
            }

            // Backend tự tính số tiền cuối cùng
            const totalAmount =
            prepared.subtotal - discountAmount;

            if (
                !Number.isSafeInteger(totalAmount) ||
                totalAmount < 0
                ) {
                throw new BadRequestException(
                    'Tổng tiền đơn hàng không hợp lệ',
                );
            }

            //Tạo mã đơn hàng
            const orderCode = `DH-${randomUUID()}`

            //Tạo order
            const [order] = await this.orderModel.create(
                [
                    {
                        orderCode,
                        userId: userObjectId,

                        items: prepared.items,
                        shippingAddress: prepared.shippingAddress,

                        voucherId,
                        voucherCode,

                        subtotal: prepared.subtotal,
                        discountAmount,
                        totalAmount,

                        paymentMethod: prepared.paymentMethod,
                        paymentStatus: 'pending',
                        orderStatus: 'cho_xac_nhan',

                        note: prepared.note, 
                    },
                ],
                {session},
            );

            //Tạo VoucherUsage
            if (voucherId) {
                await this.vouchersService.createVoucherUsage(
                    voucherId,
                    userObjectId,
                    order._id,
                    discountAmount,
                    session,
                );
            }

            // 2. Tạo Payment pending nếu chọn VNPay
            if (dto.paymentMethod === PaymentMethod.VNPAY) {
                if (
                    !Number.isSafeInteger(totalAmount) ||
                    totalAmount <= 0
                ) {
                    throw new BadRequestException(
                        'Số tiền thanh toán VNPay phải lớn hơn 0',
                    );
                }

                const transactionCode = randomBytes(16)
                    .toString('hex');

                await this.paymentModel.create(
                    [
                        {
                            orderId: order._id,
                            userId: userObjectId,
                            provider: 'vnpay',
                            transactionCode,
                            amount: totalAmount,
                            currency: 'VND',
                            status: PaymentStatus.PENDING,
                        },
                    ],
                    { session },
                );
            }

            //làm rỗng giỏ hàng
            const cartResult = await this.cartModel.updateOne(
                {
                    userId: userObjectId,
                    'items.0' : { $exists:true},
                },
                {
                    $set:{ items: []},
                },
                {session},
            );

            if (cartResult.modifiedCount !== 1){
                throw new BadRequestException(
                    'Giỏ hàng đã thay đổi vui lòng thử lại'
                );
            }

            return order;
        });
    }

    async getMyOrders(userId:string){
        //Kiểm tra định dạng Id
        if (!Types.ObjectId.isValid(userId)){
            throw new BadRequestException (
                'User Id không hợp lệ'
            );
        }

        //Tìm các Order thuộc user đăng nhập
        return this.orderModel.find({
            userId: new Types.ObjectId(userId),
        })
        .sort({createdAt:-1})
        .lean()
        .exec();
        }

    async getOrderDetail(user: AuthenticatedUser, orderId: string) {
        const userId = user.id
        // 1. Kiểm tra định dạng ObjectId
        if (
            !Types.ObjectId.isValid(userId) ||
            !Types.ObjectId.isValid(orderId)
        ) {
            throw new BadRequestException(
                'User ID hoặc Order ID không hợp lệ',
            );
        }

        // 2. Chỉ tìm Order thuộc Customer đang đăng nhập
        const order = await this.orderModel
            .findOne({
                _id: new Types.ObjectId(orderId),
                userId: new Types.ObjectId(userId),
            })
            .lean()
            .exec();

        // 3. Không tìm thấy hoặc không thuộc Customer
        if (!order) {
            throw new NotFoundException(
                'Không tìm thấy đơn hàng',
            );
        }


        const ability = this.abilityFactory.createForUser(user);

        const orderSubject = subject(Subject.Order, {
            userId: String(order.userId),
        });

        if (!ability.can(Action.Read, orderSubject)) {
            throw new ForbiddenException(
                'Bạn không có quyền xem đơn hàng này',
            );
        }

        // 4. Trả chi tiết Order
        return order;
    }



    async cancelOrder(user: AuthenticatedUser, orderId: string) {
        const userId = user.id
        // 1. Kiểm tra ObjectId
        if (
            !Types.ObjectId.isValid(userId) ||
            !Types.ObjectId.isValid(orderId)
        ) {
            throw new BadRequestException(
                'User ID hoặc Order ID không hợp lệ',
            );
        }

        const userObjectId = new Types.ObjectId(userId);
        const orderObjectId = new Types.ObjectId(orderId);

        // 2. Bắt đầu MongoDB Transaction
        return this.connection.transaction(async (session) => {

        // 3. Tìm Order thuộc Customer hiện tại
        const order = await this.orderModel.findOne({
                _id: orderObjectId,
                userId: userObjectId,
            }).session(session);

        if (!order) {
            throw new NotFoundException(
                'Không tìm thấy đơn hàng',
            );
        }


        const ability = this.abilityFactory.createForUser(user);

        const orderSubject = subject(Subject.Order, {
            userId: String(order.userId),
        });

        if (!ability.can(Action.Cancel, orderSubject)) {
            throw new ForbiddenException(
                'Bạn không có quyền hủy đơn hàng này',
            );
        }


        // 4. Kiểm tra điều kiện được phép hủy
        if (
            order.orderStatus !== 'cho_xac_nhan' ||
            order.paymentMethod !== 'cod' ||
            order.paymentStatus !== 'pending'
        ) {
            throw new ConflictException(
                'Đơn hàng không đủ điều kiện hủy',
            );
        }

        // 5. Đổi trạng thái với điều kiện nguyên tử
        const statusResult = await this.orderModel.updateOne(
            {
                _id: orderObjectId,
                userId: userObjectId,
                orderStatus: 'cho_xac_nhan',
                paymentMethod: 'cod',
                paymentStatus: 'pending',
            },
            {
                $set: {
                    orderStatus: 'da_huy',
                },
            },
            { session },
        );

        if (statusResult.modifiedCount !== 1) {
            throw new ConflictException(
                'Trạng thái đơn hàng đã thay đổi',
            );
        }

        await this.restoreOrderStock(order, session);

        // 8. Hoàn lượt Voucher nếu Order có sử dụng
        if (order.voucherId) {
            await this.vouchersService.reverseVoucherUsage(
                order._id,
                userObjectId,
                new Types.ObjectId(String(order.voucherId)),
                session,
            );
        }

        // 9. Trả Order sau khi cập nhật
        const cancelledOrder = await this.orderModel
            .findById(orderObjectId)
            .session(session)
            .lean()
            .exec();

        return {
                message: 'Hủy đơn hàng thành công',
                order: cancelledOrder,
            };
        });
    }

    async updateOrderStatus(
        orderId: string,
        dto: UpdateOrderStatusDto,
    ) {
        // 1. Kiểm tra ObjectId
        if (!Types.ObjectId.isValid(orderId)) {
            throw new BadRequestException(
                'Order ID không hợp lệ',
            );
        }

        const orderObjectId = new Types.ObjectId(orderId);

        // 2. Quy định trạng thái đứng trước
        const previousStatus: Record<string, string> = {
            da_xac_nhan: 'cho_xac_nhan',
            dang_giao: 'da_xac_nhan',
            da_giao: 'dang_giao',
        };

        const expectedStatus = previousStatus[dto.status];

        if (!expectedStatus) {
            throw new BadRequestException(
                'Trạng thái yêu cầu không hợp lệ',
            );
        }

        // 3. Cập nhật có điều kiện, nguyên tử
        const updatedOrder = await this.orderModel
            .findOneAndUpdate(
            {
                _id: orderObjectId,
                orderStatus: expectedStatus,
                $or: [
                    {
                        paymentMethod: 'cod',
                        paymentStatus: 'pending',
                    },
                    {
                        paymentMethod: 'vnpay',
                        paymentStatus: 'paid',
                    },
                ],
            },
            {
                $set: {
                    orderStatus: dto.status,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
            )
            .lean()
            .exec();

        if (updatedOrder) {
            return {
                message: 'Cập nhật trạng thái đơn hàng thành công',
                order: updatedOrder,
            };
        }

        // 4. Phân biệt Order không tồn tại
        // và Order không đủ điều kiện chuyển trạng thái
        const exists = await this.orderModel.exists({
            _id: orderObjectId,
        });

        if (!exists) {
            throw new NotFoundException(
                'Không tìm thấy đơn hàng',
            );
        }

        throw new ConflictException(
            'Không thể chuyển trạng thái đơn hàng',
        );
    }

    async getAllOrders() {
        return this.orderModel
            .find()
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()
            .exec();
    }


    async getManagedOrderDetail(orderId: string) {
        if (!Types.ObjectId.isValid(orderId)) {
            throw new BadRequestException(
            'Order ID không hợp lệ',
            );
        }

        const order = await this.orderModel
            .findById(orderId)
            .lean()
            .exec();

        if (!order) {
            throw new NotFoundException(
            'Không tìm thấy đơn hàng',
            );
        }

        return order;
    }

    private async restoreOrderStock(
        order: Order,
        session: ClientSession,
    ): Promise<void> {
        // Gộp số lượng nếu có Variant trùng nhau
        const quantities = new Map<
            string,
            {
            productId: Types.ObjectId;
            variantId: Types.ObjectId;
            quantity: number;
            }
        >();

        for (const item of order.items) {
            const key = `${item.productId}:${item.variantId}`;
            const existing = quantities.get(key);

            if (existing) {
            existing.quantity += item.quantity;
            } else {
            quantities.set(key, {
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
            });
            }
        }

        // Hoàn stock bằng phép cập nhật nguyên tử
        for (const item of quantities.values()) {
            const result = await this.productModel.updateOne(
            {
                _id: item.productId,
                'variants._id': item.variantId,
            },
            {
                $inc: {
                'variants.$.stock': item.quantity,
                },
            },
            { session },
            );

            if (result.modifiedCount !== 1) {
            throw new ConflictException(
                'Không thể hoàn tồn kho sản phẩm',
            );
            }
        }
    }


    async releaseFailedVnpayOrder(
        orderId: Types.ObjectId,
        userId: Types.ObjectId,
        session: ClientSession,
    ): Promise<void> {
        // 1. Tìm đơn VNPay đang chờ xác nhận
        const order = await this.orderModel.findOne({
            _id: orderId,
            userId,
            paymentMethod: 'vnpay',
            paymentStatus: 'pending',
            orderStatus: 'cho_xac_nhan',
        }).session(session);

        if (!order) {
            throw new ConflictException(
            'Order không đủ điều kiện hoàn tài nguyên',
            );
        }

        // 2. Đổi trạng thái có điều kiện
        const result = await this.orderModel.updateOne(
            {
            _id: orderId,
            userId,
            paymentMethod: 'vnpay',
            paymentStatus: 'pending',
            orderStatus: 'cho_xac_nhan',
            },
            {
            $set: {
                paymentStatus: 'failed',
                orderStatus: 'da_huy',
            },
            },
            { session },
        );

        if (result.modifiedCount !== 1) {
            throw new ConflictException(
            'Order đã được xử lý bởi request khác',
            );
        }

        // 3. Hoàn tồn kho
        await this.restoreOrderStock(order, session);

        // 4. Hoàn lượt Voucher nếu Order có sử dụng
        if (order.voucherId) {
            await this.vouchersService.reverseVoucherUsage(
            order._id,
            userId,
            new Types.ObjectId(String(order.voucherId)),
            session,
            );
        }
    }


}
