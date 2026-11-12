import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { Product } from '../products/schemas/product.schema';
import { AddToCartDTO } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {}

  // Lấy hoặc khởi tạo giỏ hàng của người dùng
  async getOrCreateCart(userId: string): Promise<CartDocument> {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('User ID không hợp lệ');
    }

    let cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    return cart;
  }

  // Lấy chi tiết giỏ hàng và kiểm tra tính hợp lệ về giá & tồn kho thực tế
  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    // Tính toán tổng tiền và kiểm tra cập nhật giá / tồn kho
    let totalAmount = 0;
    let totalItems = 0;

    const validatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await this.productModel.findById(item.productId).exec();
        const variant = product?.variants?.find((v) => v.sku === item.sku);

        const currentPrice = variant?.price ?? item.price;
        const currentStock = variant?.stock ?? 0;
        // Khả dụng nếu sản phẩm tồn tại và đang active (hoặc còn tồn kho nếu quản lý kho)
        const isAvailable = Boolean(product && product.isActive);

        totalAmount += currentPrice * item.quantity;
        totalItems += item.quantity;

        return {
          productId: String(item.productId),
          sku: item.sku,
          name: product?.name || item.name,
          slug: product?.slug || item.slug,
          color: item.color,
          storage: item.storage,
          image: item.image,
          price: currentPrice,
          quantity: item.quantity,
          stock: currentStock,
          isAvailable,
        };
      }),
    );

    return {
      _id: String(cart._id),
      userId,
      items: validatedItems,
      totalItems,
      totalAmount,
    };
  }

  // Thêm sản phẩm vào giỏ hàng
  async addToCart(userId: string, dto: AddToCartDTO) {
    if (!isValidObjectId(dto.productId)) {
      throw new BadRequestException('Product ID không hợp lệ');
    }

    const cart = await this.getOrCreateCart(userId);

    const product = await this.productModel.findById(dto.productId).exec();
    if (!product || !product.isActive) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã ngừng kinh doanh');
    }

    const variant = product.variants?.find((v) => v.sku === dto.sku);
    if (!variant) {
      throw new NotFoundException(`Biến thể SKU ${dto.sku} không tồn tại`);
    }

    const quantityToAdd = dto.quantity && dto.quantity > 0 ? dto.quantity : 1;

    const existingItemIndex = cart.items.findIndex((item) => item.sku === dto.sku);

    if (existingItemIndex > -1) {
      const currentQty = cart.items[existingItemIndex].quantity;
      const newQty = currentQty + quantityToAdd;

      if (variant.stock > 0 && variant.stock < newQty) {
        throw new BadRequestException(
          `Số lượng tồn kho không đủ (chỉ còn ${variant.stock} sản phẩm)`,
        );
      }

      cart.items[existingItemIndex].quantity = newQty;
    } else {
      if (variant.stock > 0 && variant.stock < quantityToAdd) {
        throw new BadRequestException(
          `Số lượng tồn kho không đủ (chỉ còn ${variant.stock} sản phẩm)`,
        );
      }

      const imageUrl =
        variant.images?.[0] || product.images?.[0] || '';

      cart.items.push({
        productId: new Types.ObjectId(dto.productId),
        sku: variant.sku,
        name: product.name,
        slug: product.slug,
        color: variant.color || '',
        storage: variant.storage || '',
        image: imageUrl,
        price: variant.price,
        quantity: quantityToAdd,
      });
    }

    await cart.save();
    return this.getCart(userId);
  }

  // Cập nhật số lượng của 1 sản phẩm trong giỏ
  async updateQuantity(userId: string, sku: string, quantity: number) {
    if (quantity < 1) {
      return this.removeItem(userId, sku);
    }

    const cart = await this.getOrCreateCart(userId);
    const itemIndex = cart.items.findIndex((i) => i.sku === sku);

    if (itemIndex === -1) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    const item = cart.items[itemIndex];
    const product = await this.productModel.findById(item.productId).exec();
    const variant = product?.variants?.find((v) => v.sku === sku);

    if (!variant) {
      throw new NotFoundException('Biến thể sản phẩm không tồn tại');
    }

    if (variant.stock > 0 && variant.stock < quantity) {
      throw new BadRequestException(
        `Số lượng tồn kho không đủ (chỉ còn ${variant.stock} sản phẩm)`,
      );
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    return this.getCart(userId);
  }

  // Xóa 1 sản phẩm khỏi giỏ hàng
  async removeItem(userId: string, sku: string) {
    const cart = await this.getOrCreateCart(userId);
    cart.items = cart.items.filter((item) => item.sku !== sku);
    await cart.save();
    return this.getCart(userId);
  }

  // Xóa toàn bộ giỏ hàng
  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    cart.items = [];
    await cart.save();
    return {
      message: 'Đã xóa toàn bộ giỏ hàng',
      items: [],
      totalItems: 0,
      totalAmount: 0,
    };
  }
}
