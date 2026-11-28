import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  ServiceUnavailableException
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHmac } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import { Order } from '../orders/schemas/order.schema';
import {
  Payment,
  PaymentStatus,
} from './schemas/payment.schema';
import { OrdersService } from '../orders/orders.service';


@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name)

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly ordersService: OrdersService,
  ) {}

  // Định dạng ngày VNPay: yyyyMMddHHmmss, GMT+7
  private formatVnpayDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    return (
      values.year +
      values.month +
      values.day +
      values.hour +
      values.minute +
      values.second
    );
  }

  async createPaymentUrl(
    userId: string,
    orderId: string,
    ipAddress: string,
  ) {
    // 1. Kiểm tra ID
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

    // 2. Kiểm tra Order thuộc Customer
    const order = await this.orderModel
      .findOne({
        _id: orderObjectId,
        userId: userObjectId,
        paymentMethod: 'vnpay',
      })
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng VNPay',
      );
    }

    if (
      order.paymentStatus !== 'pending' ||
      order.orderStatus !== 'cho_xac_nhan'
    ) {
      throw new ConflictException(
        'Đơn hàng không còn chờ thanh toán',
      );
    }

    // 3. Tìm Payment đang chờ
    const payment = await this.paymentModel
      .findOne({
        orderId: orderObjectId,
        userId: userObjectId,
        provider: 'vnpay',
        status: PaymentStatus.PENDING,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!payment) {
      throw new NotFoundException(
        'Không tìm thấy giao dịch chờ thanh toán',
      );
    }

    // 4. Đối chiếu số tiền từ database
    if (
      !Number.isSafeInteger(payment.amount) ||
      payment.amount <= 0 ||
      payment.amount !== order.totalAmount ||
      payment.currency !== 'VND'
    ) {
      throw new ConflictException(
        'Số tiền Payment và Order không khớp',
      );
    }

    // 5. Thời hạn thanh toán: 15 phút
    const createdAt = new Date(payment.createdAt);
    const expiresAt = new Date(
      createdAt.getTime() + 15 * 60 * 1000,
    );

    if (new Date() >= expiresAt) {
      throw new ConflictException(
        'Phiên thanh toán đã hết hạn',
      );
    }

    // 6. Đọc cấu hình VNPay
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const paymentBaseUrl =
      process.env.VNPAY_PAYMENT_URL;
    const returnUrl = process.env.VNPAY_RETURN_URL;

    if (
      !tmnCode ||
      !hashSecret ||
      !paymentBaseUrl ||
      !returnUrl
    ) {
      throw new InternalServerErrorException(
        'Chưa cấu hình VNPay đầy đủ',
      );
    }

    // 7. VNPay yêu cầu số tiền nhân 100
    const vnpAmount = payment.amount * 100;

    if (
      !Number.isSafeInteger(vnpAmount) ||
      String(vnpAmount).length > 12
    ) {
      throw new BadRequestException(
        'Số tiền vượt giới hạn VNPay',
      );
    }

    // 8. Chuẩn bị tham số
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(vnpAmount),
      vnp_CreateDate: this.formatVnpayDate(createdAt),
      vnp_ExpireDate: this.formatVnpayDate(expiresAt),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddress,
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan don hang ${order.orderCode.replace(/[^A-Za-z0-9]/g, '')}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: payment.transactionCode,
    };

    // 9. Sắp xếp và encode query string
    const queryParams = new URLSearchParams();

    for (const key of Object.keys(params).sort()) {
      queryParams.append(key, params[key]);
    }

    const signData = queryParams.toString();

    // 10. Ký HMAC-SHA512
    const secureHash = createHmac(
      'sha512',
      hashSecret,
    )
      .update(signData, 'utf8')
      .digest('hex');

    queryParams.append('vnp_SecureHash', secureHash);

    const paymentUrl =
      `${paymentBaseUrl}?${queryParams.toString()}`;

    return {
      message: 'Tạo URL thanh toán thành công',
      orderId: order._id,
      transactionCode: payment.transactionCode,
      amount: payment.amount,
      expiresAt,
      paymentUrl,
    };
  }


    verifyVnpaySignature(
        query: Record<string, unknown>,
    ): boolean {
        const secret = process.env.VNPAY_HASH_SECRET;

        if (!secret) {
            throw new InternalServerErrorException(
            'Chưa cấu hình VNPay Hash Secret',
            );
        }

        const receivedHash = query.vnp_SecureHash;

        // Chữ ký SHA-512 dạng hex có 128 ký tự
        if (
            typeof receivedHash !== 'string' ||
            !/^[a-fA-F0-9]{128}$/.test(receivedHash)
        ) {
            return false;
        }

        // Chỉ lấy tham số VNPay hợp lệ, không lấy SecureHash
        const params: Record<string, string> = {};

        for (const [key, value] of Object.entries(query)) {
            if (
            !key.startsWith('vnp_') ||
            key === 'vnp_SecureHash' ||
            key === 'vnp_SecureHashType'
            ) {
            continue;
            }

            // Không chấp nhận tham số có nhiều giá trị
            // hoặc object lồng nhau
            if (typeof value !== 'string') {
            return false;
            }

            params[key] = value;
        }

        // Sắp xếp giống lúc tạo Payment URL
        const searchParams = new URLSearchParams();

        for (const key of Object.keys(params).sort()) {
            searchParams.append(key, params[key]);
        }

        const signData = searchParams.toString();

        const calculatedHash = createHmac('sha512', secret)
            .update(signData, 'utf8')
            .digest();

        const receivedBuffer = Buffer.from(
            receivedHash,
            'hex',
        );

        return (
            calculatedHash.length === receivedBuffer.length &&
            timingSafeEqual(calculatedHash, receivedBuffer)
        );
    }


    async handleVnpayReturn(
        query: Record<string, unknown>,
    ) {
        // 1. Xác minh chữ ký
        if (!this.verifyVnpaySignature(query)) {
            return {
            valid: false,
            message: 'Chữ ký VNPay không hợp lệ',
            };
        }

        // 2. Đọc thông tin giao dịch
        const transactionCode = query.vnp_TxnRef;
        const amount = query.vnp_Amount;
        const responseCode = query.vnp_ResponseCode;
        const transactionStatus =
            query.vnp_TransactionStatus;
        const tmnCode = query.vnp_TmnCode;

        if (
            typeof transactionCode !== 'string' ||
            typeof amount !== 'string' ||
            !/^\d+$/.test(amount) ||
            typeof responseCode !== 'string' ||
            typeof transactionStatus !== 'string' ||
            tmnCode !== process.env.VNPAY_TMN_CODE
        ) {
            return {
            valid: false,
            message: 'Dữ liệu VNPay không hợp lệ',
            };
        }

        // 3. Tìm Payment bằng mã giao dịch
        const payment = await this.paymentModel
            .findOne({
            transactionCode,
            provider: 'vnpay',
            })
            .lean()
            .exec();

        if (!payment) {
            return {
            valid: false,
            message: 'Không tìm thấy giao dịch',
            };
        }

        // 4. Đối chiếu số tiền
        if (
            !Number.isSafeInteger(payment.amount) ||
            payment.amount * 100 !== Number(amount)
        ) {
            return {
            valid: false,
            message: 'Số tiền thanh toán không khớp',
            };
        }

        // 5. Chỉ đánh giá kết quả từ VNPay
        const success =
            responseCode === '00' &&
            transactionStatus === '00';

        return {
            valid: true,
            orderId: payment.orderId,
            transactionCode,
            vnpayReportedSuccess: success,
            paymentStatus: payment.status,
            message: success
            ? 'VNPay báo giao dịch thành công; chờ Backend xác nhận'
            : 'Giao dịch chưa được xác nhận thành công',
        };
    }


    async handleVnpayIpn(query: Record<string, unknown>) {
        // 1. Phải kiểm tra chữ ký trước
        if (!this.verifyVnpaySignature(query)) {
            return {
            RspCode: '97',
            Message: 'Invalid signature',
            };
        }

        // 2. Lấy dữ liệu
        const txnRef = query.vnp_TxnRef;
        const amount = query.vnp_Amount;
        const tmnCode = query.vnp_TmnCode;
        const responseCode = query.vnp_ResponseCode;
        const transactionStatus = query.vnp_TransactionStatus;
        const providerTransactionId = query.vnp_TransactionNo;

        if (
            typeof txnRef !== 'string' ||
            !txnRef ||
            typeof amount !== 'string' ||
            !/^\d+$/.test(amount) ||
            typeof tmnCode !== 'string' ||
            tmnCode !== process.env.VNPAY_TMN_CODE ||
            typeof responseCode !== 'string' ||
            !/^\d{2}$/.test(responseCode) ||
            typeof transactionStatus !== 'string' ||
            !/^\d{2}$/.test(transactionStatus) ||
            typeof providerTransactionId !== 'string' ||
            !/^\d+$/.test(providerTransactionId)
        ) {
            return {
            RspCode: '99',
            Message: 'Invalid callback data',
            };
        }


        const success =
            responseCode === '00' &&
            transactionStatus === '00';

        // Các mã thất bại rõ ràng từ VNPay
        const failureResponseCodes = new Set([
                '09', '10', '11', '12', '13',
                '24', '51', '65', '75', '79',
            ]);

        const failed =
            transactionStatus === '02' &&
            failureResponseCodes.has(responseCode);

        // Trạng thái chưa xác định hoặc cần đối soát
        if (!success && !failed) {
            return {
                RspCode: '99',
                Message: 'Transaction requires reconciliation',
            };
        }

        try {
            return await this.connection.transaction(
                async (session) => {
                    // 3. Đọc Payment trong Transaction
                    const payment = await this.paymentModel
                    .findOne({
                        transactionCode: txnRef,
                        provider: 'vnpay',
                    })
                    .session(session)
                    .exec();

                    if (!payment) {
                    return {
                        RspCode: '01',
                        Message: 'Order not found',
                    };
                    }

                    // 4. Đối chiếu số tiền
                    if (
                    !Number.isSafeInteger(payment.amount) ||
                    payment.amount * 100 !== Number(amount)
                    ) {
                    return {
                        RspCode: '04',
                        Message: 'Invalid amount',
                    };
                    }

                    // 5. Đọc Order
                    const order = await this.orderModel
                    .findOne({
                        _id: payment.orderId,
                        userId: payment.userId,
                        paymentMethod: 'vnpay',
                    })
                    .session(session)
                    .exec();

                    if (!order) {
                    return {
                        RspCode: '01',
                        Message: 'Order not found',
                    };
                    }

                    if (order.totalAmount !== payment.amount) {
                    return {
                        RspCode: '04',
                        Message: 'Invalid amount',
                    };
                    }

                    // 6. Chống xử lý IPN lặp
                    if (payment.status !== PaymentStatus.PENDING) {
                        const sameResult =
                            payment.vnpResponseCode === responseCode &&
                            payment.vnpTransactionStatus === transactionStatus &&
                            payment.providerTransactionId === providerTransactionId;

                        if (sameResult) {
                            return {
                            RspCode: '02',
                            Message: 'Order already updated',
                            };
                        }

                        return {
                            RspCode: '99',
                            Message: 'Conflicting transaction result',
                        };
                    }


                    if (
                    order.paymentStatus !== 'pending' ||
                    order.orderStatus !== 'cho_xac_nhan'
                    ) {
                    return {
                        RspCode: '02',
                        Message: 'Order state has changed',
                    };
                    }

                    // 7. Cập nhật Payment có điều kiện
                    const paymentResult =
                    await this.paymentModel.updateOne(
                        {
                        _id: payment._id,
                        status: PaymentStatus.PENDING,
                        },
                        {
                        $set: {
                            status: success
                                    ? PaymentStatus.PAID
                                    : PaymentStatus.FAILED,

                                providerTransactionId,

                                vnpResponseCode: responseCode,
                                vnpTransactionStatus: transactionStatus,

                                paidAt: success ? new Date() : null,
                            },
                        },
                        { session },
                    );

                    if (paymentResult.modifiedCount !== 1) {
                    throw new ConflictException(
                        'Payment state changed',
                    );
                    }

                    // 8. Cập nhật Order trong cùng Transaction                    
                    if (success) {
                        // Thanh toán thành công
                        const orderResult = await this.orderModel.updateOne(
                            {
                                _id: order._id,
                                paymentMethod: 'vnpay',
                                paymentStatus: 'pending',
                                orderStatus: 'cho_xac_nhan',
                            },
                            {
                            $set: {
                                paymentStatus: 'paid',
                            },
                            },
                            { session },
                        );

                        if (orderResult.modifiedCount !== 1) {
                            throw new ConflictException(
                            'Order state changed',
                            );
                        }
                        } else if (failed) {
                        // Thanh toán thất bại cuối cùng:
                        // chuyển Order sang da_huy và hoàn tài nguyên
                        await this.ordersService.releaseFailedVnpayOrder(
                            order._id,
                            payment.userId,
                            session,
                        );
                    }
                    return {
                    RspCode: '00',
                    Message: 'Confirm Success',
                    };

                },
            );
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(
                `VNPay IPN transaction failed: ${error.message}`,
                error.stack,
                );
            } else {
                this.logger.error('VNPay IPN transaction failed');
            }

            return {
                RspCode: '99',
                Message: 'Unknown error',
            };
        }
    }





}
