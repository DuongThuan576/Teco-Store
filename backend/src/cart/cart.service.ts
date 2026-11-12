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

    let totalAmount = 0;
    let totalItems = 0;

    const validatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await this.productModel.findById(item.productId).exec();
        const variant = product?.variants?.find(
          (v) =>
            (item.sku && v.sku === item.sku) ||
            (item.variantId && String((v as any)._id) === String(item.variantId)),
        );

        const currentPrice = variant?.price ?? item.price ?? 0;
        const currentStock = variant?.stock ?? 0;
        const isAvailable = Boolean(product && product.isActive);

        totalAmount += currentPrice * item.quantity;
        totalItems += item.quantity;

        const effectiveSku = variant?.sku || item.sku || '';
        const effectiveVariantId = variant
          ? String((variant as any)._id)
          : item.variantId
          ? String(item.variantId)
          : undefined;

        return {
          productId: String(item.productId),
          variantId: effectiveVariantId,
          sku: effectiveSku,
          name: product?.name || item.name || '',
          slug: product?.slug || item.slug || '',
          color: variant?.color || item.color || '',
          storage: variant?.storage || item.storage || '',
          image: variant?.images?.[0] || product?.images?.[0] || item.image || '',
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

    // Tìm variant theo sku hoặc variantId, hoặc lấy biến thể đầu tiên
    let variant = product.variants?.find((v) => {
      if (dto.sku && v.sku === dto.sku) return true;
      if (
        dto.variantId &&
        (String((v as any)._id) === dto.variantId || v.sku === dto.variantId)
      )
        return true;
      return false;
    });

    if (!variant && !dto.sku && !dto.variantId && product.variants?.length > 0) {
      variant = product.variants[0];
    }

    if (!variant) {
      throw new NotFoundException(
        dto.sku
          ? `Biến thể SKU ${dto.sku} không tồn tại`
          : 'Không tìm thấy biến thể phù hợp cho sản phẩm',
      );
    }

    const sku = variant.sku;
    const variantId = (variant as any)._id
      ? new Types.ObjectId((variant as any)._id)
      : undefined;
    const quantityToAdd = dto.quantity && dto.quantity > 0 ? dto.quantity : 1;

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.sku === sku ||
        (variantId && item.variantId?.toString() === variantId.toString()),
    );

    if (existingItemIndex > -1) {
      const currentQty = cart.items[existingItemIndex].quantity;
      const newQty = currentQty + quantityToAdd;

      if (variant.stock > 0 && variant.stock < newQty) {
        throw new BadRequestException(
          `Số lượng tồn kho không đủ (chỉ còn ${variant.stock} sản phẩm)`,
        );
      }

      cart.items[existingItemIndex].quantity = newQty;
      cart.items[existingItemIndex].sku = sku;
      if (variantId) cart.items[existingItemIndex].variantId = variantId;
      cart.items[existingItemIndex].price = variant.price;
    } else {
      if (variant.stock > 0 && variant.stock < quantityToAdd) {
        throw new BadRequestException(
          `Số lượng tồn kho không đủ (chỉ còn ${variant.stock} sản phẩm)`,
        );
      }

      const imageUrl = variant.images?.[0] || product.images?.[0] || '';

      cart.items.push({
        productId: new Types.ObjectId(dto.productId),
        variantId,
        sku,
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

  // Cập nhật số lượng của 1 sản phẩm trong giỏ (bằng sku hoặc variantId)
  async updateQuantity(userId: string, idOrSku: string, quantity: number) {
    if (quantity < 1) {
      return this.removeItem(userId, idOrSku);
    }

    const cart = await this.getOrCreateCart(userId);
    const itemIndex = cart.items.findIndex(
      (i) => i.sku === idOrSku || i.variantId?.toString() === idOrSku,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    const item = cart.items[itemIndex];
    const product = await this.productModel.findById(item.productId).exec();
    const variant = product?.variants?.find(
      (v) =>
        (item.sku && v.sku === item.sku) ||
        (item.variantId && String((v as any)._id) === String(item.variantId)),
    );

    if (variant && variant.stock > 0 && variant.stock < quantity) {
      throw new BadRequestException(
        `Số lượng tồn kho không đủ (chỉ còn ${variant.stock} sản phẩm)`,
      );
    }

    cart.items[itemIndex].quantity = quantity;
    if (variant) {
      cart.items[itemIndex].price = variant.price;
    }
    await cart.save();
    return this.getCart(userId);
  }

  // Xóa 1 sản phẩm khỏi giỏ hàng (bằng sku hoặc variantId)
  async removeItem(userId: string, idOrSku: string) {
    const cart = await this.getOrCreateCart(userId);
    cart.items = cart.items.filter(
      (i) => i.sku !== idOrSku && i.variantId?.toString() !== idOrSku,
    );
    await cart.save();
    return this.getCart(userId);
  }

  // Xóa toàn bộ giỏ hàng
  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    cart.items = [];
    await cart.save();
    return {
      message: 'Đã làm trống giỏ hàng thành công',
      items: [],
      totalItems: 0,
      totalAmount: 0,
    };
  }
}
