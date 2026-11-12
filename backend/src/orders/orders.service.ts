import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { Cart } from '../cart/schemas/cart.schema';
import { CreateOrderDTO } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,

    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,
  ) {}

  // Tạo mã đơn hàng duy nhất: ví dụ TS-M3K4J8-1234
  private generateOrderCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TS-${timestamp}-${random}`;
  }

  // 1. Tạo đơn hàng mới
  async createOrder(userId: string, dto: CreateOrderDTO) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('User ID không hợp lệ');
    }

    // 1.1 Xác định danh sách sản phẩm cần đặt hàng
    let orderItemsData: Array<{
      productId: string;
      sku: string;
      quantity: number;
    }> = [];

    const orderedSkus: string[] = [];

    if (dto.items && dto.items.length > 0) {
      // Mua trực tiếp
      orderItemsData = dto.items;
      orderItemsData.forEach((i) => orderedSkus.push(i.sku));
    } else {
      // Mua từ giỏ hàng của user
      const cart = await this.cartModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .exec();

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Giỏ hàng của bạn đang trống');
      }

      const candidateItems =
        dto.selectedSkus && dto.selectedSkus.length > 0
          ? cart.items.filter((item) => dto.selectedSkus!.includes(item.sku))
          : cart.items;

      if (candidateItems.length === 0) {
        throw new BadRequestException('Chưa chọn sản phẩm nào để đặt hàng');
      }

      orderItemsData = candidateItems.map((item) => ({
        productId: String(item.productId),
        sku: item.sku,
        quantity: item.quantity,
      }));

      orderItemsData.forEach((i) => orderedSkus.push(i.sku));
    }

    // 1.2 Kiểm tra tồn kho và lấy thông tin chi tiết từng sản phẩm
    const processedItems: OrderItem[] = [];
    let subtotal = 0;

    for (const itemReq of orderItemsData) {
      if (!isValidObjectId(itemReq.productId)) {
        throw new BadRequestException(`ID sản phẩm ${itemReq.productId} không hợp lệ`);
      }

      const product = await this.productModel.findById(itemReq.productId).exec();
      if (!product || !product.isActive) {
        throw new BadRequestException(
          `Sản phẩm "${product?.name || itemReq.productId}" hiện không khả dụng`,
        );
      }

      const variant = product.variants?.find((v) => v.sku === itemReq.sku);
      if (!variant) {
        throw new BadRequestException(`Mã SKU ${itemReq.sku} không tồn tại`);
      }

      if (variant.stock > 0 && variant.stock < itemReq.quantity) {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" (${variant.storage || ''} ${variant.color || ''}) chỉ còn ${variant.stock} chiếc trong kho`,
        );
      }

      const itemTotal = variant.price * itemReq.quantity;
      subtotal += itemTotal;

      const img =
        variant.images?.[0] || product.images?.[0] || '';

      processedItems.push({
        productId: new Types.ObjectId(itemReq.productId),
        sku: variant.sku,
        name: product.name,
        slug: product.slug,
        color: variant.color || '',
        storage: variant.storage || '',
        image: img,
        price: variant.price,
        quantity: itemReq.quantity,
      });
    }

    // 1.3 Tính toán tổng thanh toán
    const discountAmount = Math.max(0, dto.discountAmount || 0);
    const shippingFee = 0; // Miễn phí vận chuyển
    const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

    const orderCode = this.generateOrderCode();

    // 1.4 Trừ số lượng tồn kho của các biến thể đã đặt (nếu có tồn kho)
    for (const item of processedItems) {
      await this.productModel
        .updateOne(
          {
            _id: item.productId,
            'variants.sku': item.sku,
            'variants.stock': { $gt: 0 },
          },
          {
            $inc: { 'variants.$.stock': -item.quantity },
          },
        )
        .exec();
    }

    // 1.5 Xóa các sản phẩm đã đặt khỏi giỏ hàng của user
    await this.cartModel
      .updateOne(
        { userId: new Types.ObjectId(userId) },
        {
          $pull: {
            items: { sku: { $in: orderedSkus } },
          },
        },
      )
      .exec();

    // 1.6 Lưu đơn hàng vào MongoDB
    const order = await this.orderModel.create({
      orderCode,
      userId: new Types.ObjectId(userId),
      customerInfo: dto.customerInfo,
      items: processedItems,
      subtotal,
      discountAmount,
      shippingFee,
      totalAmount,
      paymentMethod: dto.paymentMethod || PaymentMethod.COD,
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.PENDING,
      merchantInfo: dto.merchantInfo || {},
    });

    return {
      message: 'Đặt hàng thành công!',
      order,
    };
  }

  // 2. Lấy danh sách đơn hàng của người dùng hiện tại
  async getUserOrders(userId: string, page = 1, limit = 10) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('User ID không hợp lệ');
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 3. Lấy chi tiết đơn hàng
  async getOrderDetail(userId: string, userRole: string, idOrCode: string) {
    let order: OrderDocument | null = null;

    if (isValidObjectId(idOrCode)) {
      order = await this.orderModel.findById(idOrCode).exec();
    }

    if (!order) {
      order = await this.orderModel.findOne({ orderCode: idOrCode }).exec();
    }

    if (!order) {
      throw new NotFoundException('Không tìm thấy thông tin đơn hàng');
    }

    // Kiểm tra quyền: chỉ người đặt hoặc admin mới được xem
    if (String(order.userId) !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }

    return order;
  }

  // 4. Hủy đơn hàng (khi đơn đang ở trạng thái pending)
  async cancelOrder(userId: string, idOrCode: string) {
    const order = await this.getOrderDetail(userId, 'customer', idOrCode);

    if (order.orderStatus !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Không thể hủy đơn hàng đang ở trạng thái "${order.orderStatus}"`,
      );
    }

    // Hoàn trả lại số lượng tồn kho
    for (const item of order.items) {
      await this.productModel
        .updateOne(
          {
            _id: item.productId,
            'variants.sku': item.sku,
          },
          {
            $inc: { 'variants.$.stock': item.quantity },
          },
        )
        .exec();
    }

    order.orderStatus = OrderStatus.CANCELLED;
    await order.save();

    return {
      message: 'Hủy đơn hàng thành công',
      order,
    };
  }

  // 5. Admin: Lấy danh sách tất cả đơn hàng kèm bộ lọc và tìm kiếm
  async getAllOrdersAdmin(
    userRole: string,
    page = 1,
    limit = 10,
    status?: string,
    search?: string,
  ) {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền truy cập');
    }

    const filter: Record<string, unknown> = {};

    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      filter.orderStatus = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { orderCode: searchRegex },
        { 'customerInfo.fullName': searchRegex },
        { 'customerInfo.phone': searchRegex },
        { 'customerInfo.email': searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 6. Admin: Cập nhật trạng thái đơn hàng
  async updateOrderStatusAdmin(
    userRole: string,
    idOrCode: string,
    newStatus: OrderStatus,
  ) {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền cập nhật');
    }

    if (!Object.values(OrderStatus).includes(newStatus)) {
      throw new BadRequestException(`Trạng thái "${newStatus}" không hợp lệ`);
    }

    const order = await this.getOrderDetail('admin', userRole, idOrCode);

    // Nếu chuyển sang hủy đơn và trước đó chưa hủy -> hoàn trả kho
    if (newStatus === OrderStatus.CANCELLED && order.orderStatus !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        await this.productModel
          .updateOne(
            { _id: item.productId, 'variants.sku': item.sku },
            { $inc: { 'variants.$.stock': item.quantity } },
          )
          .exec();
      }
    }

    order.orderStatus = newStatus;
    await order.save();

    return {
      message: `Đã cập nhật trạng thái đơn hàng thành "${newStatus}"`,
      order,
    };
  }

  // 7. Admin: Cập nhật trạng thái thanh toán
  async updatePaymentStatusAdmin(
    userRole: string,
    idOrCode: string,
    paymentStatus: PaymentStatus,
  ) {
    if (userRole !== 'admin') {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền cập nhật');
    }

    if (!Object.values(PaymentStatus).includes(paymentStatus)) {
      throw new BadRequestException(`Trạng thái thanh toán "${paymentStatus}" không hợp lệ`);
    }

    const order = await this.getOrderDetail('admin', userRole, idOrCode);
    order.paymentStatus = paymentStatus;
    await order.save();

    return {
      message: `Đã cập nhật trạng thái thanh toán thành "${paymentStatus}"`,
      order,
    };
  }
}
