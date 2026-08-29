import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RegistrationService } from "./registration.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

import { UserEntity } from "./entities/user.entity";
import { AuthTokenEntity } from "./entities/auth-token.entity";
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
    // Replaces: AdminEntity, UserEntity(old), SellerEntity, MarketingEntity,
    // TelecallerEntity, AuthEntity, CartEntity, OtpEntity — all merged into
    // UserEntity (`users`) and AuthTokenEntity (`auth_tokens`).
    TypeOrmModule.forFeature([UserEntity, AuthTokenEntity]),
  ],
  controllers: [AuthController],
  providers: [AuthService, RegistrationService, JwtStrategy, MailService],
  exports: [AuthService, RegistrationService, JwtModule],
})
export class AuthModule {}
