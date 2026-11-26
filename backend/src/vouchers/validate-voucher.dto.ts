import {
    IsString,
    Matches,
} from 'class-validator';

export class ValidateVoucherDto {
    @IsString()
    @Matches(/^[A-Za-z0-9_-]{3,30}$/, {
        message: 'Mã voucher không hợp lệ',
    })
    code: string;
}
