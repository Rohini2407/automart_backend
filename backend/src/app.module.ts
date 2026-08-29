import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { Keyv } from "keyv";
import KeyvRedis from "@keyv/redis";

import { AuthModule } from "./auth/auth.module";
import { ProductsModule } from "./products/products.module";

// ─── Entities ─────────────────────────────────────────────────────────────
import { OrderEntity } from "./orders/entities/order.entity";
import { CartModule } from "./cart/cart.module";
import { OrderModule } from "./orders/orders.module";
import { AuthTokenEntity } from "./auth/entities/auth-token.entity";
import { UserEntity } from "./auth/entities/user.entity";
import { ProductEntity } from "./products/entities/product.entity";

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
          UserEntity,
          ProductEntity,
          OrderEntity,
          AuthTokenEntity,
        ],
        synchronize: false, // Never true in prod — use migrations
        logging: config.get("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),

    // ─── Redis Cache (cache-manager v5 / @nestjs/cache-manager v2) ────────────
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        stores: [
          new Keyv({
            store: new KeyvRedis(
              `redis://${config.get("REDIS_HOST", "localhost")}:${config.get(
                "REDIS_PORT",
                6379,
              )}`,
            ),
          }),
        ],
        // v5 ttl is in MILLISECONDS (was seconds pre-v5) — REDIS_TTL env
        // value stays in seconds, we convert here.
        ttl: +config.get("REDIS_TTL", 86400) * 1000,
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
    ProductsModule,
    CartModule,
    OrderModule,
  ],
})
export class AppModule {}
