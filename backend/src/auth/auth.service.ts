import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Repository } from "typeorm";
const md5 = require("md5");
import * as bcrypt from "bcrypt";
import { LoginDto } from "./dto/login.dto";
import { AdminEntity } from "./entities/admin.entity";
import { UserEntity } from "./entities/user.entity";
import { SellerEntity } from "./entities/seller.entity";
import { MarketingEntity } from "./entities/marketing.entity";
import { TelecallerEntity } from "./entities/telecaller.entity";
import { AuthEntity } from "./entities/auth.entity";
import { CartEntity } from "./entities/cart.entity";
import { randomInt, createHash } from "crypto";
import { OtpEntity } from "./entities/otp.entity";
import { MailService } from "../common/mail/mail.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { SetPasswordDto } from "./dto/set-password.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";

// ─── Expiry constants (documented discrepancy from README, kept intentional) ──
const REGULAR_LOGIN_EXPIRY = "30d";
const GOOGLE_LOGIN_EXPIRY = "14d";

// Cache TTL — cache-manager v5+ expects milliseconds, not a { ttl } options object.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

    @InjectRepository(OtpEntity)
    private otpRepo: Repository<OtpEntity>,
    private mailService: MailService,

    private jwtService: JwtService,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  // ─── Main Login Entry Point ─────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const { email, password, fcm_token, device_type, guestID } = dto;

    if (!email) {
      throw new BadRequestException({
        status: "404",
        message: "Please enter data",
      });
    }

    const hashedPassword = md5(password);

    // ── Step 1: Try Admin ────────────────────────────────────────────────────
    const admin = await this.adminRepo.findOne({
      where: { email, password: hashedPassword },
    });
    if (admin) {
      return this.buildAdminToken(admin, "admin");
    }

    // ── Step 2: Try User (email OR phone) ────────────────────────────────────
    const user = await this.userRepo
      .createQueryBuilder("u")
      .where("u.email = :email OR u.phone = :email", { email })
      .getOne();

    // Guard against Google-only accounts where password is null — bcrypt.compare
    // throws if the stored hash isn't a string.
    if (
      user &&
      user.password &&
      (await bcrypt.compare(password, user.password))
    ) {
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
      return this.buildNamedToken(
        telecaller.name,
        telecaller.email,
        "telecaller",
      );
    }

    // ── Step 6: No match ─────────────────────────────────────────────────────
    throw new UnauthorizedException({
      status: "401",
      message: "Invalid credentials",
    });
  }

  // ─── Token Builders ─────────────────────────────────────────────────────────

  private async buildAdminToken(admin: AdminEntity, type: string) {
    const payload = { name: admin.name, email: admin.email, type };
    const token = await this.signToken(payload, REGULAR_LOGIN_EXPIRY);
    await this.saveAuthRecord(admin.email, type, token);
    await this.cacheToken(admin.email, type, token);
    return { message: "Login Successful", token };
  }

  private async buildUserToken(
    user: UserEntity,
    fcm_token?: string,
    device_type?: string,
    guestID?: string,
  ) {
    const payload = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      type: "user",
    };
    const token = await this.signToken(payload, REGULAR_LOGIN_EXPIRY);

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
    const cartItems = await this.cartRepo.find({
      where: { email: user.email },
    });
    const totalQuantity = cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    await this.saveAuthRecord(
      user.email,
      "user",
      token,
      fcm_token,
      device_type,
    );
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
    const token = await this.signToken(payload, REGULAR_LOGIN_EXPIRY);
    await this.saveAuthRecord(seller.email, "seller", token);
    await this.cacheToken(seller.email, "seller", token);
    return { message: "Login Successful", token };
  }

  private async buildNamedToken(name: string, email: string, type: string) {
    const payload = { name, email, type };
    const token = await this.signToken(payload, REGULAR_LOGIN_EXPIRY);
    await this.saveAuthRecord(email, type, token);
    await this.cacheToken(email, type, token);
    return { message: "Login Successful", token };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async signToken(
    payload: Record<string, any>,
    expiresIn: string,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn });
  }

  private async saveAuthRecord(
    email: string,
    usertype: string,
    token: string,
    fcmToken?: string,
    deviceType?: string,
  ) {
    const record = this.authRepo.create({
      email,
      usertype,
      token,
      fcmToken,
      deviceType,
    });
    await this.authRepo.save(record);
  }

  /** Cache token in Redis: key = auth:<email>:<usertype> */
  private async cacheToken(email: string, usertype: string, token: string) {
    const cacheKey = `auth:${email}:${usertype}`;
    // NOTE: cache-manager v5+ set() takes ttl in milliseconds as a plain number,
    // not a { ttl } options object (that was the v3/v4 shape).
    await this.cacheManager.set(cacheKey, token, CACHE_TTL_MS);
  }

  /** Validate token from Redis cache (used by JWT strategy) */
  async validateCachedToken(
    email: string,
    usertype: string,
    token: string,
  ): Promise<boolean> {
    const cacheKey = `auth:${email}:${usertype}`;
    const cachedToken = await this.cacheManager.get<string>(cacheKey);
    return cachedToken === token;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    const user = await this.userRepo.findOne({ where: { email } });
    let type: "user" | "seller" | null = user ? "user" : null;

    if (!type) {
      const seller = await this.sellerRepo.findOne({ where: { email } });
      if (seller) type = "seller";
    }

    if (!type) {
      throw new BadRequestException("Email not found!");
    }

    const otp = randomInt(100000, 999999).toString();

    await this.otpRepo.save(this.otpRepo.create({ otp, type, email }));
    await this.mailService.sendOtpEmail(email, otp);

    return { message: "otp send to email" };
  }

  async setPassword(dto: SetPasswordDto) {
    const { otp, email, newPassword, fcm_token, device_type } = dto;

    const otpRecord = await this.otpRepo.findOne({
      where: { otp, email },
      order: { date: "DESC" },
    });

    if (!otpRecord) {
      throw new BadRequestException("Invalid OTP");
    }

    const hashedPassword = createHash("md5").update(newPassword).digest("hex");
    let token: string;

    if (otpRecord.type === "user") {
      const user = await this.userRepo.findOne({ where: { email } });
      if (!user) throw new BadRequestException("Invalid OTP");

      user.password = hashedPassword;
      await this.userRepo.save(user);

      token = this.jwtService.sign({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        type: "user",
      });

      await this.authRepo.save(
        this.authRepo.create({
          email: user.email,
          token,
          usertype: "user",
          fcmToken: fcm_token ?? null,
          deviceType: device_type ?? null,
        }),
      );
    } else if (otpRecord.type === "seller") {
      const seller = await this.sellerRepo.findOne({ where: { email } });
      if (!seller) throw new BadRequestException("Invalid OTP");

      seller.password = hashedPassword;
      await this.sellerRepo.save(seller);

      // Fixed: this was incorrectly hardcoded to "user" — a seller resetting
      // their password should get a seller-typed token, or they'd lose access
      // to seller-only routes after a password reset.
      token = this.jwtService.sign({
        firstName: seller.firstName,
        lastName: seller.lastName,
        email: seller.email,
        type: "seller",
      });

      await this.authRepo.save(
        this.authRepo.create({
          email: seller.email,
          token,
          usertype: "seller",
        }),
      );
    } else {
      throw new BadRequestException("Invalid OTP");
    }

    await this.otpRepo.delete({ id: otpRecord.id });

    return { message: "Password updated successfully!", token };
  }

  // ─── POST /api/googlelogin ──────────────────────────────────────────────
  async googleLogin(dto: GoogleLoginDto) {
    const { name, email, guestId, fcm_token, device_type } = dto;

    // 1. Split full name into firstName + lastName on first space
    const firstSpaceIdx = name.indexOf(" ");
    const firstName =
      firstSpaceIdx === -1 ? name : name.slice(0, firstSpaceIdx);
    const lastName = firstSpaceIdx === -1 ? "" : name.slice(firstSpaceIdx + 1);

    // 2. Migrate guest cart (cart.email guestId → userEmail), fire-and-forget
    //    is unsafe here since it must complete before response — await it.
    if (guestId) {
      await this.cartRepo.update({ email: guestId }, { email });
    }

    // 3. Check user table first
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      const token = await this.signToken(
        {
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          type: "user",
        },
        GOOGLE_LOGIN_EXPIRY,
      );
      await this.persistAuthRow(email, "user", token, fcm_token, device_type);
      return { message: "Login Successful", token, type: "user" };
    }

    // 4. Check seller table (payload only matches on email, per README note #6)
    const existingSeller = await this.sellerRepo.findOne({ where: { email } });
    if (existingSeller) {
      const token = await this.signToken(
        {
          firstName: existingSeller.firstName,
          lastName: existingSeller.lastName,
          email: existingSeller.email,
          type: "seller",
        },
        GOOGLE_LOGIN_EXPIRY,
      );
      await this.persistAuthRow(email, "seller", token, fcm_token, device_type);
      return { message: "Seller Login Successful", token, type: "seller" };
    }

    // 5. Not found anywhere → auto-register as new user, no password
    const newUser = this.userRepo.create({
      firstName,
      lastName,
      email,
      password: null, // Google-only account, no local password
    });
    const savedUser = await this.userRepo.save(newUser);

    const token = await this.signToken(
      {
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        type: "user",
      },
      GOOGLE_LOGIN_EXPIRY,
    );
    await this.persistAuthRow(email, "user", token, fcm_token, device_type);

    // Send welcome email only for newly registered users; don't let a mail
    // failure fail the login/registration response.
    try {
      await this.mailService.sendWelcomeEmail(email, firstName);
    } catch (err) {
      // swallow — log via mailService's own logger
    }

    return { message: "Registration Successful", token, type: "user" };
  }

  // ─── POST /api/logout ───────────────────────────────────────────────────
  async logout(bearerToken: string) {
    if (!bearerToken) {
      throw new UnauthorizedException("Token not provided");
    }

    const result = await this.authRepo.delete({ token: bearerToken });
    if (result.affected === 0) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    return { message: "token deleted", token: bearerToken };
  }

  // ─── POST /api/logoutforall ──────────────────────────────────────────────
  async logoutForAll(bearerToken: string) {
    if (!bearerToken) {
      throw new UnauthorizedException("Token not provided");
    }

    let decoded: { email?: string };
    try {
      decoded = this.jwtService.verify(bearerToken);
    } catch (err) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    if (!decoded?.email) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const result = await this.authRepo.delete({ email: decoded.email });
    if (result.affected === 0) {
      throw new NotFoundException("User session not found");
    }

    return { message: "Successfully logged out" };
  }

  private async persistAuthRow(
    email: string,
    usertype: string,
    token: string,
    fcm_token?: string,
    device_type?: string,
  ) {
    // Fixed: AuthEntity's TS properties are camelCase (fcmToken, deviceType);
    // snake_case is only the DB column name via @Column({ name: ... }).
    const row = this.authRepo.create({
      email,
      usertype,
      token,
      fcmToken: fcm_token ?? null,
      deviceType: device_type ?? null,
    });
    // Note: no upsert — matches existing README-documented behavior of
    // inserting a fresh row per login. Add cleanup/upsert later if needed.
    await this.authRepo.save(row);
  }
}
