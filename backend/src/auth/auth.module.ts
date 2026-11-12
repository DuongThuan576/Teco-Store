import { Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserSchema } from './schemas/user.schema';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthSessionSchema, AuthSession } from './schemas/auth-session.schema';


@Module({
  imports:[
    MongooseModule.forFeature([
      {
        name: User.name , 
        schema: UserSchema
      },
      {
        name:AuthSession.name,
        schema: AuthSessionSchema
      }
    ]),

    JwtModule.registerAsync({
      inject:[ConfigService],
      useFactory: (configService:ConfigService) =>{
        const secret = configService.get<string>('JWT_SECRET')
        
        if (!secret || secret.length <32){
          throw new Error('JWT_SECRET Không hợp lệ');
        }

        return {
          secret: secret,
          signOptions: { expiresIn: '15m' as const },
        }
      }
    })
  ],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, JwtModule, MongooseModule],
})
export class AuthModule {}
