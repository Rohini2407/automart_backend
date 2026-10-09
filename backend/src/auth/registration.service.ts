import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { DataSource, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import * as nodemailer from "nodemailer";

import { RegistrationDto } from "./dto/registration.dto";
import { UserEntity, CartItem } from "./entities/user.entity";
import { AuthTokenEntity } from "./entities/auth-token.entity";
import { RegisterSellerDto } from "./dto/register-seller.dto";
import { generateSellerId } from "src/common/utils/id-generator.util";
import md5 = require("md5");

interface SellerDocFiles {
  personalProof: Express.Multer.File;
  businessAddressProof: Express.Multer.File;
  gstDocument: Express.Multer.File;
  bankProof: Express.Multer.File;
}

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    private dataSource: DataSource,
    private jwtService: JwtService,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async register(dto: RegistrationDto) {
    const {
      firstName,
      lastName,
      phone,
      email,
      password,
      address,
      state,
      city,
      pincode,
      guestID,
      fcm_token,
      device_type,
    } = dto;

    // ── Step 1: Check seller conflict (email OR phone) ─────────────────────
    const sellerConflict = await this.userRepo
      .createQueryBuilder("u")
      .where("u.role = :role", { role: "seller" })
      .andWhere("(u.email = :email OR u.phone = :phone)", { email, phone })
      .getOne();

    if (sellerConflict) {
      throw new ConflictException({
        status: "409",
        message:
          "This email/phone is already registered as a seller. Please use a different account.",
      });
    }

    // ── Step 2: Check customer uniqueness ───────────────────────────────────
    const [existingByEmail, existingByPhone] = await Promise.all([
      this.userRepo.findOne({ where: { email, role: "customer" } }),
      this.userRepo.findOne({ where: { phone, role: "customer" } }),
    ]);

    if (existingByEmail || existingByPhone) {
      const errors: Record<string, string> = {};
      if (existingByEmail) errors.email = "This email is already registered";
      if (existingByPhone)
        errors.phone = "This phone number is already registered";
      return {
        status: "401",
        message: "Validation Error",
        errors,
      };
    }

    // ── Step 3: Hash password ──────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Step 4: Pull any guest cart out of Redis before the transaction ────
    // Guest carts are no longer MySQL rows — see auth.service.ts notes on
    // why they moved to Redis (`cart:guest:<guestID>`).
    const guestItems = guestID
      ? ((await this.cacheManager.get<CartItem[]>(`cart:guest:${guestID}`)) ??
        [])
      : [];

    // ── Step 5: Insert + session record as a single DB transaction ─────────
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: UserEntity;
    let token: string;

    try {
      const newUser = queryRunner.manager.create(UserEntity, {
        role: "customer",
        firstName,
        lastName: lastName ?? "",
        phone,
        email,
        password: hashedPassword,
        address,
        state,
        city,
        pincode,
        cart: guestItems.length > 0 ? guestItems : null,
      });
      savedUser = await queryRunner.manager.save(newUser);

      const payload = {
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        type: "user",
      };
      token = this.jwtService.sign(payload, { expiresIn: "30d" });

      const authRecord = queryRunner.manager.create(AuthTokenEntity, {
        email: savedUser.email,
        tokenType: "session",
        usertype: "customer",
        fcmToken: fcm_token ?? null,
        deviceType: (device_type as any) ?? null,
      });
      await queryRunner.manager.save(authRecord);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error("Registration transaction failed:", err);
      throw new InternalServerErrorException({
        status: "500",
        message: "Registration failed",
      });
    } finally {
      await queryRunner.release();
    }

    if (guestItems.length > 0) {
      await this.cacheManager.del(`cart:guest:${guestID}`);
    }

    // ── Cache token in Redis (non-critical, outside transaction) ───────────
    const cacheKey = `auth:${savedUser.email}:user`;
    await this.cacheManager.set(cacheKey, token, 30 * 24 * 60 * 60 * 1000);

    const totalQuantity = guestItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // ── Send welcome email (non-blocking, doesn't fail registration) ───────
    this.sendWelcomeEmail(savedUser.email, savedUser.firstName).catch((err) =>
      console.error("Welcome email failed:", err),
    );

    return {
      status: "200",
      message: "Register Successful",
      token,
      totalQuantity,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SELLER REGISTRATION — replaces the legacy `POST /api/regseller` PHP
  // controller. Differs from customer `register()` in three deliberate ways:
  //   1. No JWT is issued — a seller can't log in until an admin flips
  //      `status` from 'pending' to 'active' (AuthService.login() already
  //      enforces this gate).
  //   2. Password is hashed with MD5, not bcrypt. This matches
  //      AuthService.verifyPassword(), which still compares seller
  //      passwords with `md5(password) === account.password` (preserved
  //      from the legacy code). If you migrate sellers to bcrypt, both
  //      sides need to change together — flagging this rather than
  //      quietly fixing just one half and breaking seller login.
  //   3. Uniqueness is a single `email` lookup across the whole `users`
  //      table (email has a global UNIQUE constraint), instead of the
  //      legacy code's separate seller+user table checks.
  // ─────────────────────────────────────────────────────────────────────────
  async registerSeller(dto: RegisterSellerDto, files: SellerDocFiles) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException({
        status: "409",
        message:
          existing.role === "seller"
            ? "This email is already registered as a seller."
            : "This email is already registered.",
      });
    }

    const sellerId = generateSellerId(dto.firstName, dto.phone);
    const hashedPassword = md5(dto.password);

    const relPath = (subdir: string, file: Express.Multer.File) =>
      `/assets/uploads/${subdir}/${file.filename}`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedSeller: UserEntity;
    try {
      const newSeller = queryRunner.manager.create(UserEntity, {
        role: "seller",
        externalId: sellerId,
        sellerType: dto.sellerType ?? "individual",
        businessName: dto.businessName,
        firstName: dto.firstName,
        lastName: dto.lastName ?? null,
        phone: dto.phone,
        whatsapp: dto.whatsapp ?? null,
        email: dto.email,
        password: hashedPassword,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        gstNumber: dto.gstNumber ?? null,
        shopActNumber: dto.shopActNumber ?? null,
        iecNumber: dto.iecNumber ?? null,
        bankAccountName: dto.bankAccountName,
        accountNumber: dto.accountNumber,
        ifscCode: dto.ifscCode,
        documents: {
          personalProof: relPath("personalProof", files.personalProof),
          businessAddressProof: relPath(
            "businessAddressProof",
            files.businessAddressProof,
          ),
          gstDocument: relPath("gstDocument", files.gstDocument),
          bankProof: relPath("bankProof", files.bankProof),
        },
        // Replaces the legacy hardcoded acc_status = "Unverified" string.
        // The schema's `status` enum only has active/inactive/pending, and
        // AuthService.login() already gates seller login on status === 'active'.
        status: "pending",
      });
      savedSeller = await queryRunner.manager.save(newSeller);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error("Seller registration transaction failed:", err);
      throw new InternalServerErrorException({
        status: "500",
        message: "Seller registration failed",
      });
    } finally {
      await queryRunner.release();
    }

    // Non-blocking, matches the sendWelcomeEmail pattern above.
    // TODO: add a `sendSellerRegistrationEmail(email, firstName, sellerId)`
    // method to your existing MailService (src/common/mail/mail.service.ts) —
    // reusing sendWelcomeEmail's transporter setup, just a different template.
    this.sendSellerConfirmationEmail(
      savedSeller.email,
      savedSeller.firstName ?? "",
      sellerId,
    ).catch((err) => console.error("Seller confirmation email failed:", err));

    return {
      status: "200",
      message: "Seller Registration Successfully!",
      sellerId,
    };
  }

  private async sendSellerConfirmationEmail(
    toEmail: string,
    firstName: string,
    sellerId: string,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: +(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
          <h2 style="color: #e74c3c;">Welcome to AutoMart, ${firstName}!</h2>
          <p>Your seller account (<strong>${sellerId}</strong>) has been created and is <strong>pending verification</strong>.</p>
          <p>You'll be able to log in once our team reviews your documents.</p>
          <br/>
          <p><strong>Team AutoMart</strong></p>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "AutoMart <no-reply@automart.com>",
      to: toEmail,
      subject: "AutoMart Seller Registration Received",
      html,
    });
  }

  private async sendWelcomeEmail(
    toEmail: string,
    firstName: string,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: +(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
          <h2 style="color: #e74c3c;">Welcome to AutoMart, ${firstName}!</h2>
          <p>Thank you for registering with us. Your account has been created successfully.</p>
          <p>Start exploring the best auto parts and accessories at unbeatable prices.</p>
          <br/>
          <p>Happy Shopping!</p>
          <p><strong>Team AutoMart</strong></p>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "AutoMart <no-reply@automart.com>",
      to: toEmail,
      subject: "Welcome to AutoMart!",
      html,
    });
  }
}
