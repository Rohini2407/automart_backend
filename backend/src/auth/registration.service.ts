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
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import * as nodemailer from "nodemailer";

import { RegistrationDto } from "./dto/registration.dto";
import { UserEntity } from "./entities/user.entity";
import { SellerEntity } from "./entities/seller.entity";
import { AuthEntity } from "./entities/auth.entity";
import { CartEntity } from "./entities/cart.entity";

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    @InjectRepository(SellerEntity)
    private sellerRepo: Repository<SellerEntity>,

    @InjectRepository(AuthEntity)
    private authRepo: Repository<AuthEntity>,

    @InjectRepository(CartEntity)
    private cartRepo: Repository<CartEntity>,

    private jwtService: JwtService,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  // ─── Main Registration Entry Point ─────────────────────────────────────────
  async register(dto: RegistrationDto) {
    const {
      firstName,
      lastName,
      phone,
      email,
      password,
      guestID,
      fcm_token,
      device_type,
    } = dto;

    // ── Step 1: Check seller conflict (email OR phone) ───────────────────────
    const sellerConflict = await this.sellerRepo
      .createQueryBuilder("s")
      .where("s.email = :email OR s.phone = :phone", { email, phone })
      .getOne();

    if (sellerConflict) {
      throw new ConflictException({
        status: "409",
        message:
          "This email/phone is already registered as a seller. Please use a different account.",
      });
    }

    // ── Step 2: Check user uniqueness (email AND phone separately) ───────────
    const [existingByEmail, existingByPhone] = await Promise.all([
      this.userRepo.findOne({ where: { email } }),
      this.userRepo.findOne({ where: { phone } }),
    ]);

    if (existingByEmail || existingByPhone) {
      const errors: Record<string, string> = {};
      if (existingByEmail) errors.email = "This email is already registered";
      if (existingByPhone)
        errors.phone = "This phone number is already registered";
      // Return 401 validation-style response matching doc spec
      return {
        status: "401",
        message: "Validation Error",
        errors,
      };
    }

    // ── Step 3: Hash password ────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Step 4: Migrate guest cart → new email (before insert) ──────────────
    if (guestID) {
      await this.cartRepo
        .createQueryBuilder()
        .update(CartEntity)
        .set({ email })
        .where("email = :guestID", { guestID })
        .execute();
    }

    // ── Step 5: Insert new user ──────────────────────────────────────────────
    let savedUser: UserEntity;
    try {
      const newUser = this.userRepo.create({
        firstName,
        lastName: lastName ?? "",
        phone,
        email,
        password: hashedPassword,
      });
      savedUser = await this.userRepo.save(newUser);
    } catch {
      throw new InternalServerErrorException({
        status: "500",
        message: "Registration failed",
      });
    }

    // ── Step 6: Confirm insert by re-querying ────────────────────────────────
    const confirmedUser = await this.userRepo.findOne({
      where: { id: savedUser.id },
    });
    if (!confirmedUser) {
      throw new InternalServerErrorException({
        status: "500",
        message: "Registration failed",
      });
    }

    // ── Step 7: Generate JWT ─────────────────────────────────────────────────
    const payload = {
      firstName: confirmedUser.firstName,
      lastName: confirmedUser.lastName,
      email: confirmedUser.email,
      type: "user",
    };
    const token = this.jwtService.sign(payload, { expiresIn: "30d" });

    // ── Step 8: Save auth record ─────────────────────────────────────────────
    const authRecord = this.authRepo.create({
      email: confirmedUser.email,
      usertype: "user",
      token,
      fcmToken: fcm_token,
      deviceType: device_type,
    });
    await this.authRepo.save(authRecord);

    // Cache token in Redis
    const cacheKey = `auth:${confirmedUser.email}:user`;
    await this.cacheManager.set(cacheKey, token, 30 * 24 * 60 * 60 * 1000);

    // ── Step 9: Get cart total quantity ──────────────────────────────────────
    const cartItems = await this.cartRepo.find({
      where: { email: confirmedUser.email },
    });
    const totalQuantity = cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // ── Step 10: Send welcome email (non-blocking) ───────────────────────────
    this.sendWelcomeEmail(confirmedUser.email, confirmedUser.firstName).catch(
      (err) => console.error("Welcome email failed:", err),
    );

    return {
      status: "200",
      message: "Register Successful",
      token,
      totalQuantity,
    };
  }

  // ─── Welcome Email ──────────────────────────────────────────────────────────
  private async sendWelcomeEmail(
    toEmail: string,
    firstName: string,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST ?? "smtp.mailtrap.io",
      port: +(process.env.MAIL_PORT ?? 587),
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
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
      from: "AutoMart <mail@auto-mart.co.in>",
      to: toEmail,
      subject: "Welcome to AutoMart!",
      html,
    });
  }
}
