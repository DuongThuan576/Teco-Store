import { Injectable } from "@nestjs/common";

import {
    AbilityBuilder,
    createMongoAbility,
    MongoAbility,
    InferSubjects,
} from "@casl/ability"

import { Action } from "../enums/action.enum";
import { Subject } from "../enums/subject.enum";

import { UserRole } from "../../user-role.enum";
import { AuthenticatedUser } from "../../guards/jwt-auth.guard";

import { User } from "../../schemas/user.schema";
import { Cart } from "../../../carts/schemas/cart.schema";
import { Product } from "../../../products/schemas/product.schema";
import { Brand } from "../../../brands/schemas/brand.schema";
import { Category } from "../../../categories/schemas/category.schema";
import { ProductLine } from "../../../productlines/schemas/productline.schema";
import { Address } from "../../../addresses/schemas/address.schema";

type Subjects = InferSubjects<typeof User 
                            | typeof Cart 
                            | typeof Product 
                            | typeof Brand
                            | typeof Category
                            | typeof ProductLine
                            | typeof Address>
                            | Subject
                            | 'all';

export type AppAbility = MongoAbility <
    [Action, Subjects ]
>;

@Injectable()
export class AbilityFactory {
    createForUser(user: AuthenticatedUser) : AppAbility {

        const{can, build} = new AbilityBuilder<AppAbility>(createMongoAbility);

        //Quyền dành cho Admin
        if (user.role === UserRole.ADMIN) {

            //Danh mục, sản phẩmm
            can(Action.Manage, Subject.Product);
            can(Action.Manage, Subject.Category);
            can(Action.Manage, Subject.Brand);
            can(Action.Manage, Subject.ProductLine);
            
            //Voucher, Đánh giá, Đơn hàng
            can(Action.Manage, Subject.Order);
            can(Action.Manage, Subject.Voucher);
            can(Action.Manage, Subject.Review);
        }

        //quyền dành cho admin
        if (user.role === UserRole.CUSTOMER){
            //xem danh mục sản phẩm
            can(Action.Read, Subject.Product);
            can(Action.Read, Subject.ProductLine);
            can(Action.Read, Subject.Category);
            can(Action.Read, Subject.Brand);

            //quản lý hồ sơ của mình 
            can(Action.Read, User,{
               _id :user.id,
            });
            
            can(Action.Update, User, {
                _id: user.id,
            })

            //quản lý giỏ hàng của mình
            can(Action.Read, Cart, {
                userId : user.id,
            })
            can(Action.Update, Cart,{
                userId : user.id,
            })

            //quản lý địa chỉ của mình
            can(Action.Create , Address)

            can(Action.Read, Address, {
                userId : user.id
            })

            can(Action.Update, Address, {
                userId : user.id
            })

            //Đánh giá sản phẩm

        }
        return build();
    }
}