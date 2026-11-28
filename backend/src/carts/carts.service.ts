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

import { ForbiddenException } from '@nestjs/common';
import { subject } from '@casl/ability';

import { AbilityFactory } from '../auth/authorization/ability/ability.factory';
import { Action } from '../auth/authorization/enums/action.enum';
import { Subject } from '../auth/authorization/enums/subject.enum';

import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,

    private readonly abilityFactory: AbilityFactory,
  ) {}

  async getMyCart(user: AuthenticatedUser) {
    const userId = user.id;
    // 1. Kiểm tra User ID
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        'User ID không hợp lệ',
      );
    }


    const ability = this.abilityFactory.createForUser(user);

    const cartSubject = subject(Subject.Cart,   {
        userId,
    });

    if (!ability.can(Action.Read, cartSubject)) {
        throw new ForbiddenException(
            'Bạn không có quyền xem giỏ hàng này',
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

    // 4. Tính tổng số lượng sản phẩm và populate chi tiết
    const totalItems = cart.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const populatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await this.productModel.findById(item.productId).lean().exec();
        const variant = product?.variants?.find(
          (v) => String((v as any)._id) === String(item.variantId),
        );
        const price = variant?.price ?? 0;
        return {
          ...item,
          productId: String(item.productId),
          variantId: String(item.variantId),
          sku: variant?.sku || '',
          name: product?.name || '',
          slug: product?.slug || '',
          color: variant?.color || '',
          storage: variant?.storage || '',
          image: variant?.images?.[0] || product?.images?.[0] || '',
          price,
          stock: variant?.stock ?? 0,
          isAvailable: Boolean(product && product.isActive),
        };
      }),
    );
    const totalAmount = populatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 5. Trả giỏ hàng
    return {
      ...cart,
      items: populatedItems,
      totalItems,
      totalAmount,
    };
  }


    async addItem(user: AuthenticatedUser, dto: AddCartItemDTO) {
        const userId = user.id;

        if (!isValidObjectId(userId)) {
            throw new BadRequestException('User ID không hợp lệ');
        }

        const ability = this.abilityFactory.createForUser(user);

        const cartSubject = subject(Subject.Cart, {
            userId,
        });

        if (!ability.can(Action.Update, cartSubject)) {
            throw new ForbiddenException(
                'Bạn không có quyền thêm sản phẩm vào giỏ hàng',
            );
        }

        let { productId, variantId, quantity } = dto;

        if (!isValidObjectId(productId)) {
            throw new BadRequestException('Product ID không hợp lệ');
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new BadRequestException('Số lượng phải là số nguyên lớn hơn 0');
        }

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

        // Hỗ trợ tìm variantId qua sku nếu chỉ gửi sku
        if (!variantId && dto.sku) {
            const v = product.variants.find((item) => item.sku === dto.sku);
            if (v && (v as any)._id) {
                variantId = String((v as any)._id);
            }
        }

        if (!variantId || !isValidObjectId(variantId)) {
            throw new BadRequestException('Variant ID không hợp lệ');
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

        
        const userObjectId = new Types.ObjectId(userId);
        const productObjectId = new Types.ObjectId(productId);
        const variantObjectId = new Types.ObjectId(variantId);

        // Thử tối đa 5 lần khi có tranh chấp
        for (let attempt = 0; attempt < 5; attempt++) {

            // 1. Variant đã có => cộng quantity
            const updatedCart = await this.cartModel.findOneAndUpdate(
                {
                userId: userObjectId,
                'items.variantId': variantObjectId,
                },
                {
                $inc: {
                    'items.$.quantity': quantity,
                },
                },
                {
                returnDocument: 'after',
                runValidators: true,
                },
            );

            if (updatedCart) {
                return {
                message: 'Cập nhật số lượng giỏ hàng thành công',
                cart: updatedCart,
                };
            }

            // 2. Variant chưa có => thêm item mới
            const pushedCart = await this.cartModel.findOneAndUpdate(
                {
                userId: userObjectId,
                'items.variantId': { $ne: variantObjectId },
                },
                {
                $push: {
                    items: {
                    productId: productObjectId,
                    variantId: variantObjectId,
                    quantity,
                    addedAt: new Date(),
                    },
                },
                },
                {
                returnDocument: 'after',
                runValidators: true,
                },
            );

            if (pushedCart) {
                return {
                message: 'Thêm Variant mới vào giỏ hàng thành công',
                cart: pushedCart,
                };
            }

            // 3. Cart có thể chưa tồn tại => thử tạo mới
            try {
                const newCart = await this.cartModel.create({
                userId: userObjectId,
                items: [
                    {
                    productId: productObjectId,
                    variantId: variantObjectId,
                    quantity,
                    addedAt: new Date(),
                    },
                ],
                });

                return {
                message: 'Tạo giỏ hàng thành công',
                cart: newCart,
                };

            } catch (error) {
                const isDuplicateKey =
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 11000;

                if (!isDuplicateKey) {
                throw error;
                }

                // Cart vừa được request khác tạo.
                // Quay lại vòng lặp để thử $inc hoặc $push.
            }
        }

        throw new ConflictException(
            'Giỏ hàng đang được cập nhật, vui lòng thử lại',
        );

    }

    
    async updateItem(
        user: AuthenticatedUser,
        variantId: string,
        dto: UpdateCartItemDTO,
        ) {
        const userId = user.id;

        if (!isValidObjectId(variantId)) {
            const prod = await this.productModel.findOne({ 'variants.sku': variantId }).exec();
            const v = prod?.variants.find((item) => item.sku === variantId);
            if (v && (v as any)._id) {
                variantId = String((v as any)._id);
            }
        }

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

        const ability = this.abilityFactory.createForUser(user);

        const cartSubject = subject(Subject.Cart, {
            userId: String(cart.userId),
        });

        if (!ability.can(Action.Update, cartSubject)) {
            throw new ForbiddenException(
                'Bạn không có quyền cập nhật giỏ hàng này',
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
        user: AuthenticatedUser,
        variantId: string,
        ) {
        const userId = user.id;

        if (!isValidObjectId(variantId)) {
            const prod = await this.productModel.findOne({ 'variants.sku': variantId }).exec();
            const v = prod?.variants.find((item) => item.sku === variantId);
            if (v && (v as any)._id) {
                variantId = String((v as any)._id);
            }
        }

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

        const cart = await this.cartModel
            .findOne({
                userId: userObjectId,
                'items.variantId': variantObjectId,
            })
            .select('userId')
            .lean()
            .exec();

        if (!cart) {
            throw new NotFoundException(
                'Không tìm thấy Variant trong giỏ hàng',
            );
        }

        const ability = this.abilityFactory.createForUser(user);

        const cartSubject = subject(Subject.Cart, {
            userId: String(cart.userId),
        });

        if (!ability.can(Action.Update, cartSubject)) {
            throw new ForbiddenException(
                'Bạn không có quyền xóa sản phẩm khỏi giỏ hàng',
            );
        }

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


    async clearCart(user: AuthenticatedUser) {
        const userId = user.id;

        // 1. Kiểm tra User ID hợp lệ
        if (!isValidObjectId(userId)) {
            throw new BadRequestException(
            'User ID không hợp lệ',
            );
        }
        
        const ability = this.abilityFactory.createForUser(user);

        const cartSubject = subject(Subject.Cart, {
            userId,
        });

        if (!ability.can(Action.Update, cartSubject)) {
            throw new ForbiddenException(
                'Bạn không có quyền xóa giỏ hàng này',
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
