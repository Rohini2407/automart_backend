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
import { UserEntity, UserRole, CartItem } from "./entities/user.entity";
import { AuthTokenEntity } from "./entities/auth-token.entity";
import { randomInt, createHash } from "crypto";
import { MailService } from "../common/mail/mail.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { SetPasswordDto } from "./dto/set-password.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";

// ─── Expiry constants ────────────────────────────────────────────────────
const REGULAR_LOGIN_EXPIRY = "30d";
const GOOGLE_LOGIN_EXPIRY = "14d";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── Role ↔ legacy JWT "type" / cache-key mapping ─────────────────────────
// `users.role` (and auth_tokens.usertype) use the NEW schema naming
// ('customer'). JWT payloads, Redis cache keys, and (presumably)
// JwtStrategy/guards elsewhere in the app were built against the OLD
// naming ('user'). We translate at the edge here so nothing outside this
// service needs to change.
const ROLE_TO_LEGACY_TYPE: Record<UserRole, string> = {
  customer: "user",
  admin: "admin",
  seller: "seller",
  telecaller: "telecaller",
  marketing: "marketing",
};

const ALL_ROLES: UserRole[] = [
  "customer",
  "admin",
  "seller",
  "telecaller",
  "marketing",
];

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    @InjectRepository(AuthTokenEntity)
    private authTokenRepo: Repository<AuthTokenEntity>,

    private mailService: MailService,
    private jwtService: JwtService,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  // ─── Main Login Entry Point ───────────────────────────────────────────
  async login(dto: LoginDto) {
    const { email, password, fcm_token, device_type, guestID } = dto;

    if (!email) {
      throw new BadRequestException({
        status: "404",
        message: "Please enter data",
      });
    }

    // One lookup replaces the old 5-table sequential scan. Phone matching
    // stays scoped to 'customer' — that was the only role that ever
    // logged in via phone.
    const account = await this.userRepo
      .createQueryBuilder("u")
      .where("u.email = :identifier", { identifier: email })
      .orWhere("u.phone = :identifier AND u.role = :customerRole", {
        identifier: email,
        customerRole: "customer",
      })
      .getOne();

    if (!account) {
      throw new UnauthorizedException({
        status: "401",
        message: "Invalid credentials",
      });
    }

    const passwordOk = await this.verifyPassword(account, password);
    if (!passwordOk) {
      throw new UnauthorizedException({
        status: "401",
        message: "Invalid credentials",
      });
    }

    // NOTE: the old code gated seller login on `accStatus: "verified"` —
    // a value that never existed in the seller table's enum
    // ('active' | 'inactive' | 'pending'). That check could never have
    // passed. Using 'active' here since that's what the schema actually
    // supports — CONFIRM this is the intended gate before shipping.
    if (account.role === "seller" && account.status !== "active") {
      throw new UnauthorizedException({
        status: "401",
        message: "Invalid credentials",
      });
    }

    if (account.role === "customer") {
      return this.buildUserToken(account, fcm_token, device_type, guestID);
    }

    return this.buildToken(account);
  }

  private async verifyPassword(
    account: UserEntity,
    password: string,
  ): Promise<boolean> {
    if (!account.password) return false; // Google-only account

    if (account.role === "customer") {
      return bcrypt.compare(password, account.password);
    }
    // admin / seller / marketing / telecaller still use MD5, preserved
    // as-is from the original code. Worth revisiting separately —
    // MD5 is not a secure password hash.
    return md5(password) === account.password;
  }

  // ─── Token Builders ────────────────────────────────────────────────────

  /** Generic builder for admin / seller / marketing / telecaller. */
  private async buildToken(account: UserEntity) {
    const legacyType = ROLE_TO_LEGACY_TYPE[account.role];
    const payload =
      account.role === "seller"
        ? {
            firstName: account.firstName,
            lastName: account.lastName,
            email: account.email,
            type: legacyType,
          }
        : {
            // admin / marketing / telecaller: their old tables had a
            // single `name` field, now stored in firstName — see
            // migration note in user.entity.ts.
            name: account.firstName,
            email: account.email,
            type: legacyType,
          };

    const token = await this.signToken(payload, REGULAR_LOGIN_EXPIRY);
    await this.saveAuthRecord(account.email, account.role);
    await this.cacheToken(account.email, legacyType, token);
    return { message: "Login Successful", token };
  }

  private async buildUserToken(
    account: UserEntity,
    fcm_token?: string,
    device_type?: string,
    guestID?: string,
  ) {
    const legacyType = ROLE_TO_LEGACY_TYPE["customer"];
    const payload = {
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      type: legacyType,
    };
    const token = await this.signToken(payload, REGULAR_LOGIN_EXPIRY);

    const totalQuantity = await this.mergeGuestCartAndGetTotal(
      account,
      guestID,
    );

    await this.saveAuthRecord(
      account.email,
      "customer",
      fcm_token,
      device_type,
    );
    await this.cacheToken(account.email, legacyType, token);

    return { message: "Login Successful", token, totalQuantity };
  }

  // ─── Guest cart (Redis-backed) ─────────────────────────────────────────
  // SCHEMA CHANGE: the old `cart` table let a guest (identified by a
  // client-generated guestID) accumulate cart rows before ever having an
  // account. The consolidated schema stores `cart` as JSON ON the `users`
  // row, which doesn't exist yet for a guest. So guest carts now live in
  // Redis under `cart:guest:<id>` and get folded into `users.cart` at
  // login / registration / google-login. If guest carts need to survive
  // longer than your Redis eviction policy, this needs a different store —
  // flag for confirmation.

  private async getGuestCart(guestID?: string): Promise<CartItem[]> {
    if (!guestID) return [];
    const items = await this.cacheManager.get<CartItem[]>(
      `cart:guest:${guestID}`,
    );
    return items ?? [];
  }

  private async clearGuestCart(guestID?: string) {
    if (!guestID) return;
    await this.cacheManager.del(`cart:guest:${guestID}`);
  }

  private mergeCartItems(
    existing: CartItem[],
    incoming: CartItem[],
  ): CartItem[] {
    const merged = new Map<string, number>();
    for (const item of existing) {
      merged.set(
        item.product_id,
        (merged.get(item.product_id) ?? 0) + item.quantity,
      );
    }
    for (const item of incoming) {
      merged.set(
        item.product_id,
        (merged.get(item.product_id) ?? 0) + item.quantity,
      );
    }
    return Array.from(merged.entries()).map(([product_id, quantity]) => ({
      product_id,
      quantity,
    }));
  }

  private async mergeGuestCartAndGetTotal(
    account: UserEntity,
    guestID?: string,
  ): Promise<number> {
    const guestItems = await this.getGuestCart(guestID);
    if (guestItems.length > 0) {
      account.cart = this.mergeCartItems(account.cart ?? [], guestItems);
      await this.userRepo.save(account);
      await this.clearGuestCart(guestID);
    }
    const items = account.cart ?? [];
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async signToken(
    payload: Record<string, any>,
    expiresIn: string,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn });
  }

  private async saveAuthRecord(
    email: string,
    role: UserRole,
    fcmToken?: string,
    deviceType?: string,
  ) {
    const record = this.authTokenRepo.create({
      email,
      tokenType: "session",
      usertype: role,
      fcmToken: fcmToken ?? null,
      deviceType: (deviceType as any) ?? null,
    });
    await this.authTokenRepo.save(record);
  }

  /** Cache token in Redis: key = auth:<email>:<legacyType> */
  private async cacheToken(email: string, legacyType: string, token: string) {
    const cacheKey = `auth:${email}:${legacyType}`;
    await this.cacheManager.set(cacheKey, token, CACHE_TTL_MS);
  }

  /** Validate token from Redis cache (used by JWT strategy) */
  async validateCachedToken(
    email: string,
    legacyType: string,
    token: string,
  ): Promise<boolean> {
    const cacheKey = `auth:${email}:${legacyType}`;
    const cachedToken = await this.cacheManager.get<string>(cacheKey);
    return cachedToken === token;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    const account = await this.userRepo.findOne({ where: { email } });

    if (!account || !["customer", "seller"].includes(account.role)) {
      throw new BadRequestException("Email not found!");
    }

    const otp = randomInt(100000, 999999).toString();

    await this.authTokenRepo.save(
      this.authTokenRepo.create({
        email,
        tokenType: "otp",
        otpCode: otp,
        otpPurpose: "forgot_password",
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      }),
    );
    await this.mailService.sendOtpEmail(email, otp);

    return { message: "otp send to email" };
  }

  async setPassword(dto: SetPasswordDto) {
    const { otp, email, newPassword, fcm_token, device_type } = dto;

    const otpRecord = await this.authTokenRepo.findOne({
      where: { email, otpCode: otp, tokenType: "otp" },
      order: { createdAt: "DESC" },
    });

    if (!otpRecord) {
      throw new BadRequestException("Invalid OTP");
    }

    // Previously this branched on `otpRecord.type` ("user"/"seller") to
    // know which table to update — a value the old `otp` table's `type`
    // column couldn't actually store (its enum only covered
    // forgot_password/email_verify/login). Since email is now globally
    // unique across roles in `users`, that branch is unnecessary: just
    // look the account up directly.
    const account = await this.userRepo.findOne({ where: { email } });
    if (!account || !["customer", "seller"].includes(account.role)) {
      throw new BadRequestException("Invalid OTP");
    }

    account.password =
      account.role === "customer"
        ? await bcrypt.hash(newPassword, 10)
        : createHash("md5").update(newPassword).digest("hex");
    await this.userRepo.save(account);

    const legacyType = ROLE_TO_LEGACY_TYPE[account.role];
    const payload = {
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      type: legacyType,
    };
    const token = this.jwtService.sign(payload);

    await this.saveAuthRecord(
      account.email,
      account.role,
      fcm_token,
      device_type,
    );
    await this.cacheToken(account.email, legacyType, token);
    await this.authTokenRepo.delete({ id: otpRecord.id });

    return { message: "Password updated successfully!", token };
  }

  // ─── POST /api/googlelogin ─────────────────────────────────────────────
  async googleLogin(dto: GoogleLoginDto) {
    const { name, email, guestId, fcm_token, device_type } = dto;

    const firstSpaceIdx = name.indexOf(" ");
    const firstName =
      firstSpaceIdx === -1 ? name : name.slice(0, firstSpaceIdx);
    const lastName = firstSpaceIdx === -1 ? "" : name.slice(firstSpaceIdx + 1);

    const existingAccount = await this.userRepo.findOne({ where: { email } });

    if (existingAccount?.role === "customer") {
      const totalQuantity = await this.mergeGuestCartAndGetTotal(
        existingAccount,
        guestId,
      );
      const token = await this.signToken(
        {
          firstName: existingAccount.firstName,
          lastName: existingAccount.lastName,
          email: existingAccount.email,
          type: "user",
        },
        GOOGLE_LOGIN_EXPIRY,
      );
      await this.persistAuthRow(
        email,
        "customer",
        token,
        fcm_token,
        device_type,
      );
      // NOTE: original googleLogin response for an existing user did not
      // include totalQuantity. Adding it here for parity with regular
      // login — confirm this response-shape change is acceptable to your
      // client apps, or drop it to match the old behavior exactly.
      return {
        message: "Login Successful",
        token,
        type: "user",
        totalQuantity,
      };
    }

    if (existingAccount?.role === "seller") {
      const token = await this.signToken(
        {
          firstName: existingAccount.firstName,
          lastName: existingAccount.lastName,
          email: existingAccount.email,
          type: "seller",
        },
        GOOGLE_LOGIN_EXPIRY,
      );
      await this.persistAuthRow(email, "seller", token, fcm_token, device_type);
      return { message: "Seller Login Successful", token, type: "seller" };
    }

    // Not found anywhere → auto-register as new customer, no password
    const newAccount = this.userRepo.create({
      role: "customer",
      firstName,
      lastName,
      email,
      password: null,
    });
    const savedAccount = await this.userRepo.save(newAccount);

    await this.mergeGuestCartAndGetTotal(savedAccount, guestId);

    const token = await this.signToken(
      {
        firstName: savedAccount.firstName,
        lastName: savedAccount.lastName,
        email: savedAccount.email,
        type: "user",
      },
      GOOGLE_LOGIN_EXPIRY,
    );
    await this.persistAuthRow(email, "customer", token, fcm_token, device_type);

    try {
      await this.mailService.sendWelcomeEmail(email, firstName);
    } catch (err) {
      // swallow — log via mailService's own logger
    }

    return { message: "Registration Successful", token, type: "user" };
  }

  // ─── POST /api/logout ──────────────────────────────────────────────────
  async logout(bearerToken: string) {
    if (!bearerToken) {
      throw new UnauthorizedException("Token not provided");
    }

    let decoded: { email?: string; type?: string };
    try {
      decoded = this.jwtService.verify(bearerToken);
    } catch (err) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    if (!decoded?.email || !decoded?.type) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const cacheKey = `auth:${decoded.email}:${decoded.type}`;
    const cachedToken = await this.cacheManager.get<string>(cacheKey);

    if (cachedToken !== bearerToken) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    await this.cacheManager.del(cacheKey);

    return { message: "token deleted", token: bearerToken };
  }

  // ─── POST /api/logoutforall ─────────────────────────────────────────────
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

    await Promise.all(
      ALL_ROLES.map((role) =>
        this.cacheManager.del(
          `auth:${decoded.email}:${ROLE_TO_LEGACY_TYPE[role]}`,
        ),
      ),
    );

    const result = await this.authTokenRepo.delete({
      email: decoded.email,
      tokenType: "session",
    });
    if (result.affected === 0) {
      throw new NotFoundException("User session not found");
    }

    return { message: "Successfully logged out" };
  }

  private async persistAuthRow(
    email: string,
    role: UserRole,
    token: string,
    fcm_token?: string,
    device_type?: string,
  ) {
    await this.saveAuthRecord(email, role, fcm_token, device_type);
    await this.cacheToken(email, ROLE_TO_LEGACY_TYPE[role], token);
  }
}
