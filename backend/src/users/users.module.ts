import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';

import {
  User,
  UserSchema,
} from '../auth/schemas/user.schema';

import {
  AuthSession,
  AuthSessionSchema,
} from '../auth/schemas/auth-session.schema';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: AuthSession.name,
        schema: AuthSessionSchema,
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
