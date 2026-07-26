import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>("SMTP_HOST"),
      port: +this.config.get<number>("SMTP_PORT", 587),
      secure: this.config.get("SMTP_SECURE") === "true",
      auth: {
        user: this.config.get<string>("SMTP_USER"),
        pass: this.config.get<string>("SMTP_PASS"),
      },
    });
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>AutoMart Password Reset</h2>
        <p>Use the OTP below to reset your password. This code is valid for 10 minutes.</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px;
                    padding: 16px; background: #f4f4f4; text-align: center; border-radius: 8px;">
          ${otp}
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: this.config.get("SMTP_FROM", "AutoMart <no-reply@automart.com>"),
      to,
      subject: "AutoMart Password Reset - OTP Verification Code",
      html,
    });
  }

  /** Sent once, only for newly auto-registered Google accounts. */
  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Welcome to AutoMart, ${firstName}!</h2>
        <p>Your account was created using Google Sign-In. You can start browsing
           and shopping right away — no password needed unless you'd like to set
           one later from your account settings.</p>
        <p>Glad to have you with us.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: this.config.get("SMTP_FROM", "AutoMart <no-reply@automart.com>"),
      to,
      subject: "Welcome to AutoMart",
      html,
    });
  }
}
