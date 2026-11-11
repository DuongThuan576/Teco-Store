import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';

import { Cart } from './schemas/cart.schema';
import { AddCartItemDTO } from './add-cart-item.dto';
import { Product } from '../products/schemas/product.schema';
import { UpdateCartItemDTO } from './update-cart-item.dto';

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {}

  async getMyCart(userId: string) {
    // 1. Kiểm tra User ID
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        'User ID không hợp lệ',
      );
    }

    // 2. Tìm giỏ hàng theo người dùng
    const cart = await this.cartModel
      .findOne({
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    // 3. Nếu chưa có giỏ hàng
    if (!cart) {
      return {
        userId,
        items: [],
        totalItems: 0,
      };
    }

    // 4. Tính tổng số lượng sản phẩm
    const totalItems = cart.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // 5. Trả giỏ hàng
    return {
      ...cart,
      totalItems,
    };
  }


    async addItem(userId: string, dto: AddCartItemDTO) {
        const { productId, variantId, quantity } = dto;

        // 1. Kiểm tra Product tồn tại
        const product = await this.productModel
            .findById(productId)
            .exec();

        if (!product) {
            throw new NotFoundException(
            'Không tìm thấy sản phẩm',
            );
        }

        // 2. Kiểm tra Product còn được bán
        if (!product.isActive) {
            throw new BadRequestException(
            'Sản phẩm hiện không được kinh doanh',
            );
        }

        // 3. Kiểm tra Variant thuộc Product
        const variant = product.variants.find(
            (item) => String(item._id) === variantId,
        );

        if (!variant) {
            throw new NotFoundException(
            'Variant không thuộc sản phẩm này',
            );
        }

        // 4. Tìm giỏ hàng của User hiện tại
        let cart = await this.cartModel.findOne({
            userId: new Types.ObjectId(userId),
        });

        // 5. Xác định số lượng Variant đã có trong Cart
        const existingItem = cart?.items.find(
            (item) =>
            String(item.productId) === productId &&
            String(item.variantId) === variantId,
        );

        const currentQuantity = existingItem?.quantity ?? 0;
        const newQuantity = currentQuantity + quantity;

        // 6. Kiểm tra tổng số lượng không vượt tồn kho
        if (newQuantity > variant.stock) {
            throw new BadRequestException(
            `Không đủ hàng. Tồn kho hiện tại: ${variant.stock}`,
            );
        }

        // 7. User chưa có Cart => tạo Cart mới
        if (!cart) {
            cart = new this.cartModel({
            userId: new Types.ObjectId(userId),
            items: [],
            });
        }

        // 8. Thêm hoặc cộng dồn quantity
        if (existingItem) {
            existingItem.quantity = newQuantity;
        } else {
            cart.items.push({
            productId: new Types.ObjectId(productId),
            variantId: new Types.ObjectId(variantId),
            quantity,
            addedAt: new Date(),
            });
        }

        // 9. Lưu giỏ hàng
        try {
            await cart.save();
        } catch (error) {
            // Nếu có request đồng thời tạo Cart
            // và vi phạm unique index của userId
            if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000
            ) {
            throw new ConflictException(
                'Giỏ hàng vừa được cập nhật, vui lòng thử lại',
            );
            }

            throw error;
        }

        // 10. Trả kết quả
        return {
            message: 'Thêm sản phẩm vào giỏ hàng thành công',
            cart,
        };
    }

    
    async updateItem(
        userId: string,
        variantId: string,
        dto: UpdateCartItemDTO,
        ) {
        // 1. Kiểm tra ID
        if (
            !isValidObjectId(userId) ||
            !isValidObjectId(variantId)
        ) {
            throw new BadRequestException(
            'User ID hoặc Variant ID không hợp lệ',
            );
        }

        // 2. Tìm Cart của User có chứa Variant
        const cart = await this.cartModel.findOne({
            userId: new Types.ObjectId(userId),
            'items.variantId': new Types.ObjectId(variantId),
        });

        if (!cart) {
            throw new NotFoundException(
            'Không tìm thấy sản phẩm trong giỏ hàng',
            );
        }

        // 3. Lấy CartItem cần cập nhật
        const cartItem = cart.items.find(
            (item) => String(item.variantId) === variantId,
        );

        if (!cartItem) {
            throw new NotFoundException(
            'Variant không có trong giỏ hàng',
            );
        }

        // 4. Tìm Product đang chứa Variant
        const product = await this.productModel
            .findById(cartItem.productId)
            .exec();

        if (!product) {
            throw new NotFoundException(
            'Sản phẩm không còn tồn tại',
            );
        }

        if (!product.isActive) {
            throw new BadRequestException(
            'Sản phẩm đã ngừng kinh doanh',
            );
        }

        // 5. Kiểm tra Variant có tồn tại trong Product
        const variant = product.variants.find(
            (item) => String(item._id) === variantId,
        );

        if (!variant) {
            throw new NotFoundException(
            'Variant không còn tồn tại',
            );
        }

        // 6. Kiểm tra số lượng mới với tồn kho
        if (dto.quantity > variant.stock) {
            throw new BadRequestException(
            `Không đủ hàng. Tồn kho hiện tại: ${variant.stock}`,
            );
        }

        // 7. Cập nhật trực tiếp đúng item trong MongoDB
        const updatedCart = await this.cartModel
            .findOneAndUpdate(
            {
                userId: new Types.ObjectId(userId),
                'items.variantId': new Types.ObjectId(variantId),
            },
            {
                $set: {
                'items.$.quantity': dto.quantity,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
            )
            .exec();

        if (!updatedCart) {
            throw new NotFoundException(
            'Sản phẩm đã bị xóa khỏi giỏ hàng',
            );
        }

        return {
            message: 'Cập nhật số lượng thành công',
            cart: updatedCart,
        };
    }



    async removeItem(
        userId: string,
        variantId: string,
        ) {
        // 1. Kiểm tra định dạng ObjectId
        if (
            !isValidObjectId(userId) ||
            !isValidObjectId(variantId)
        ) {
            throw new BadRequestException(
            'User ID hoặc Variant ID không hợp lệ',
            );
        }

        const userObjectId = new Types.ObjectId(userId);
        const variantObjectId = new Types.ObjectId(variantId);

        // 2. Tìm đúng giỏ hàng và Variant của User
        const updatedCart = await this.cartModel
            .findOneAndUpdate(
            {
                userId: userObjectId,
                'items.variantId': variantObjectId,
            },
            {
                $pull: {
                items: {
                    variantId: variantObjectId,
                },
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
            )
            .exec();

        // 3. Không tìm thấy Variant trong giỏ
        if (!updatedCart) {
            throw new NotFoundException(
            'Không tìm thấy Variant trong giỏ hàng',
            );
        }

        // 4. Tính lại tổng số lượng
        const totalItems = updatedCart.items.reduce(
            (sum, item) => sum + item.quantity,
            0,
        );

        // 5. Trả kết quả
        return {
            message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
            cart: updatedCart,
            totalItems,
        };
    }


    async clearCart(userId: string) {
        // 1. Kiểm tra User ID hợp lệ
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }

        // 2. Xóa toàn bộ items của đúng User
        const updatedCart = await this.cartModel
            .findOneAndUpdate(
            {
                userId: new Types.ObjectId(userId),
            },
            {
                $set: {
                items: [],
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
            )
            .exec();

        // 3. Nếu User chưa có Cart
        if (!updatedCart) {
            return {
            message: 'Giỏ hàng đã trống',
            cart: {
                userId,
                items: [],
            },
            totalItems: 0,
            };
        }

        // 4. Trả giỏ hàng sau khi xóa items
        return {
            message: 'Đã xóa toàn bộ sản phẩm khỏi giỏ hàng',
            cart: updatedCart,
            totalItems: 0,
        };
    }


}
