import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RegistrationService } from "./registration.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

import { AdminEntity } from "./entities/admin.entity";
import { UserEntity } from "./entities/user.entity";
import { SellerEntity } from "./entities/seller.entity";
import { MarketingEntity } from "./entities/marketing.entity";
import { TelecallerEntity } from "./entities/telecaller.entity";
import { AuthEntity } from "./entities/auth.entity";
import { CartEntity } from "./entities/cart.entity";
import { OtpEntity } from "./entities/otp.entity";
import { MailService } from "src/common/mail/mail.service";

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "30d" },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      AdminEntity,
      UserEntity,
      SellerEntity,
      MarketingEntity,
      TelecallerEntity,
      AuthEntity,
      CartEntity,
      OtpEntity,
      OtpEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, RegistrationService, JwtStrategy, MailService],
  exports: [AuthService, RegistrationService, JwtModule],
})
export class AuthModule {}
