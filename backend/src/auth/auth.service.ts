import { Injectable, UnauthorizedException, BadRequestException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Repository } from "typeorm";
import * as md5 from "md5";

import { LoginDto } from "./dto/login.dto";
import { AdminEntity } from "./entities/admin.entity";
import { UserEntity } from "./entities/user.entity";
import { SellerEntity } from "./entities/seller.entity";
import { MarketingEntity } from "./entities/marketing.entity";
import { TelecallerEntity } from "./entities/telecaller.entity";
import { AuthEntity } from "./entities/auth.entity";
import { CartEntity } from "./entities/cart.entity";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminEntity)
    private adminRepo: Repository<AdminEntity>,

    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    @InjectRepository(SellerEntity)
    private sellerRepo: Repository<SellerEntity>,

    @InjectRepository(MarketingEntity)
    private marketingRepo: Repository<MarketingEntity>,

    @InjectRepository(TelecallerEntity)
    private telecallerRepo: Repository<TelecallerEntity>,

    @InjectRepository(AuthEntity)
    private authRepo: Repository<AuthEntity>,

    @InjectRepository(CartEntity)
    private cartRepo: Repository<CartEntity>,

    private jwtService: JwtService,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache
  ) {}

  // ─── Main Login Entry Point ─────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const { email, password, fcm_token, device_type, guestID } = dto;

    if (!email) {
      throw new BadRequestException({ status: "404", message: "Please enter data" });
    }

    const hashedPassword = md5(password);

    // ── Step 1: Try Admin ────────────────────────────────────────────────────
    const admin = await this.adminRepo.findOne({ where: { email, password: hashedPassword } });
    if (admin) {
      return this.buildAdminToken(admin, "admin");
    }

    // ── Step 2: Try User (email OR phone) ────────────────────────────────────
    const user = await this.userRepo
      .createQueryBuilder("u")
      .where("(u.email = :email OR u.phone = :email) AND u.password = :password", {
        email,
        password: hashedPassword,
      })
      .getOne();

    if (user) {
      return this.buildUserToken(user, fcm_token, device_type, guestID);
    }

    // ── Step 3: Try Seller (must be verified) ────────────────────────────────
    const seller = await this.sellerRepo.findOne({
      where: { email, password: hashedPassword, accStatus: "verified" },
    });
    if (seller) {
      return this.buildSellerToken(seller);
    }

    // ── Step 4: Try Marketing ────────────────────────────────────────────────
    const marketing = await this.marketingRepo.findOne({
      where: { email, password: hashedPassword },
    });
    if (marketing) {
      return this.buildNamedToken(marketing.name, marketing.email, "marketing");
    }

    // ── Step 5: Try Telecaller ────────────────────────────────────────────────
    const telecaller = await this.telecallerRepo.findOne({
      where: { email, password: hashedPassword },
    });
    if (telecaller) {
      return this.buildNamedToken(telecaller.name, telecaller.email, "telecaller");
    }

    // ── Step 6: No match ─────────────────────────────────────────────────────
    throw new UnauthorizedException({ status: "401", message: "Invalid credentials" });
  }

  // ─── Token Builders ─────────────────────────────────────────────────────────

  private async buildAdminToken(admin: AdminEntity, type: string) {
    const payload = { name: admin.name, email: admin.email, type };
    const token = this.signToken(payload);
    await this.saveAuthRecord(admin.email, type, token);
    await this.cacheToken(admin.email, type, token);
    return { message: "Login Successful", token };
  }

  private async buildUserToken(
    user: UserEntity,
    fcm_token?: string,
    device_type?: string,
    guestID?: string
  ) {
    const payload = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      type: "user",
    };
    const token = this.signToken(payload);

    // Merge guest cart → user cart
    if (guestID) {
      await this.cartRepo
        .createQueryBuilder()
        .update(CartEntity)
        .set({ email: user.email })
        .where("email = :guestID", { guestID })
        .execute();
    }

    // Get cart total quantity
    const cartItems = await this.cartRepo.find({ where: { email: user.email } });
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    await this.saveAuthRecord(user.email, "user", token, fcm_token, device_type);
    await this.cacheToken(user.email, "user", token);

    return { message: "Login Successful", token, totalQuantity };
  }

  private async buildSellerToken(seller: SellerEntity) {
    const payload = {
      firstName: seller.firstName,
      lastName: seller.lastName,
      email: seller.email,
      type: "seller",
    };
    const token = this.signToken(payload);
    await this.saveAuthRecord(seller.email, "seller", token);
    await this.cacheToken(seller.email, "seller", token);
    return { message: "Login Successful", token };
  }

  private async buildNamedToken(name: string, email: string, type: string) {
    const payload = { name, email, type };
    const token = this.signToken(payload);
    await this.saveAuthRecord(email, type, token);
    await this.cacheToken(email, type, token);
    return { message: "Login Successful", token };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private signToken(payload: object): string {
    return this.jwtService.sign(payload, { expiresIn: "30d" });
  }

  private async saveAuthRecord(
    email: string,
    usertype: string,
    token: string,
    fcmToken?: string,
    deviceType?: string
  ) {
    const record = this.authRepo.create({ email, usertype, token, fcmToken, deviceType });
    await this.authRepo.save(record);
  }

  /** Cache token in Redis: key = auth:<email>:<usertype> */
  private async cacheToken(email: string, usertype: string, token: string) {
    const cacheKey = `auth:${email}:${usertype}`;
    await this.cacheManager.set(cacheKey, token, { ttl: 30 * 24 * 60 * 60 }); // 30 days in seconds
  }

  /** Validate token from Redis cache (used by JWT strategy) */
  async validateCachedToken(email: string, usertype: string, token: string): Promise<boolean> {
    const cacheKey = `auth:${email}:${usertype}`;
    const cachedToken = await this.cacheManager.get<string>(cacheKey);
    return cachedToken === token;
  }
}
