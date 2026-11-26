import { Injectable } from "@nestjs/common";

import {
    AbilityBuilder,
    createMongoAbility,
    MongoAbility,
    InferSubjects,
    ForcedSubject
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

type Subjects =
  | InferSubjects<
      | typeof User
      | typeof Cart
      | typeof Product
      | typeof Brand
      | typeof Category
      | typeof ProductLine
      | typeof Address
    >
  | Subject
  | ForcedSubject<Subject>
  | 'all';

export type AppAbility = MongoAbility <
    [Action, Subjects ]
>;

@Injectable()
export class AbilityFactory {
    
    createForUser(user: AuthenticatedUser): AppAbility {
        const { can, build } =
            new AbilityBuilder<AppAbility>(createMongoAbility);

        // Quyền xem thông tin sản phẩm công khai
        can(Action.Read, Subject.Product);
        can(Action.Read, Subject.Category);
        can(Action.Read, Subject.Brand);
        can(Action.Read, Subject.ProductLine);

        // ADMIN
        if (user.role === UserRole.ADMIN) {
            can(Action.Manage, Subject.Product);
            can(Action.Manage, Subject.Category);
            can(Action.Manage, Subject.Brand);
            can(Action.Manage, Subject.ProductLine);

            can(Action.Manage, Subject.Order);
            can(Action.Manage, Subject.Voucher);
            can(Action.Manage, Subject.Review);
        }

        // EMPLOYEE
        if (user.role === UserRole.EMPLOYEE) {
            //product
            can(Action.Create, Subject.Product);
            can(Action.Update, Subject.Product);

            //order
            can(Action.Read, Subject.Order);
            can(Action.Update, Subject.Order);

            //review
            can(Action.Read, Subject.Review);
            can(Action.Moderate, Subject.Review);
            can(Action.Reply, Subject.Review);
        }

        // CUSTOMER
        if (user.role === UserRole.CUSTOMER) {
            //Order
            can(Action.Create, Subject.Order);
            can(Action.Read, Subject.Order, {
                userId: user.id,
            });
            can(Action.Cancel, Subject.Order, {
                userId: user.id,
            });

            //User
            can(Action.Read, Subject.User, {
                _id: user.id,
            });
            can(Action.Update, Subject.User    , {
                _id: user.id,
            });
            can(Action.ChangePassword, Subject.User, {
                _id: user.id,
            });

            //Address
            can(Action.Create, Subject.Address);

            can(Action.Read, Subject.Address, {
                userId: user.id,
            });

            can(Action.Update, Subject.Address, {
                userId: user.id,
            });

            can(Action.Delete, Subject.Address, {
                userId: user.id,
            });

            //C
            can(Action.Read, Subject.Cart, {
                userId: user.id,
            });

            can(Action.Update, Subject.Cart, {
                userId: user.id,
            });

            //Review
            can(Action.Create, Subject.Review);
            can(Action.Read, Subject.Review, {
                userId: user.id,
            });
            can(Action.Update, Subject.Review, {
                userId: user.id,
            });
            can(Action.Delete, Subject.Review, {
                userId: user.id,
            });

            //Voucher
            can(Action.ViewWallet, Subject.Voucher);
            can(Action.Validate, Subject.Voucher);
        }

    return build();
}

}