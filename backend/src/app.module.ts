import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-ioredis";

import { AuthModule } from "./auth/auth.module";

// ─── Entities ─────────────────────────────────────────────────────────────────
import { AdminEntity } from "./auth/entities/admin.entity";
import { UserEntity } from "./auth/entities/user.entity";
import { SellerEntity } from "./auth/entities/seller.entity";
import { MarketingEntity } from "./auth/entities/marketing.entity";
import { TelecallerEntity } from "./auth/entities/telecaller.entity";
import { AuthEntity } from "./auth/entities/auth.entity";
import { CartEntity } from "./auth/entities/cart.entity";

@Module({
  imports: [
    // ─── Config ───────────────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ─── MySQL via TypeORM ────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: "mysql",
        host: config.get("DB_HOST", "localhost"),
        port: +config.get("DB_PORT", 3306),
        username: config.get("DB_USERNAME", "root"),
        password: config.get("DB_PASSWORD", ""),
        database: config.get("DB_NAME", "automart"),
        entities: [
          AdminEntity,
          UserEntity,
          SellerEntity,
          MarketingEntity,
          TelecallerEntity,
          AuthEntity,
          CartEntity,
        ],
        synchronize: false, // Never true in prod — use migrations
        logging: config.get("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),

    // ─── Redis Cache ──────────────────────────────────────────────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get("REDIS_HOST", "localhost"),
        port: +config.get("REDIS_PORT", 6379),
        ttl: +config.get("REDIS_TTL", 86400), // seconds
      }),
      inject: [ConfigService],
    }),

    // ─── Rate Throttler ───────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 5 },
      { name: "medium", ttl: 10000, limit: 20 },
      { name: "long", ttl: 60000, limit: 100 },
    ]),

    // ─── Feature Modules ──────────────────────────────────────────────────────
    AuthModule,
  ],
})
export class AppModule {}
