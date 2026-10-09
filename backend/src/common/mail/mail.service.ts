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

  async sendOrderConfirmationEmail(
    to: string,
    orderId: string,
    items: Array<{
      productName: string;
      imagePath: string | null;
      quantity: number;
      price: number;
    }>,
    total: number,
  ): Promise<void> {
    const rows = items
      .map(
        (i) => `
      <tr>
        <td style="padding:8px;">${i.productName}</td>
        <td style="padding:8px; text-align:center;">${i.quantity}</td>
        <td style="padding:8px; text-align:right;">₹${i.price}</td>
      </tr>`,
      )
      .join("");

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>Order Confirmed</h2>
      <p>Your order <strong>${orderId}</strong> has been placed successfully.</p>
      <table style="width:100%; border-collapse: collapse;">${rows}</table>
      <p style="text-align:right; font-weight:bold;">Total: ₹${total}</p>
    </div>
  `;

    try {
      await this.transporter.sendMail({
        from: this.config.get("SMTP_FROM", "AutoMart <no-reply@automart.com>"),
        to,
        subject: `AutoMart Order Confirmation - ${orderId}`,
        html,
      });
    } catch (err) {
      // Never let a failed email throw and roll back a placed order — log and move on.
      console.error(`Failed to send order confirmation for ${orderId}`, err);
    }
  }

  async sendSellerNotificationEmail(
    sellerEmail: string,
    orderId: string,
    buyerName: string,
    phone: string,
    address: string,
  ): Promise<void> {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>New Order Received</h2>
      <p>Order <strong>${orderId}</strong> (Cash on Delivery)</p>
      <p><strong>Buyer:</strong> ${buyerName}<br/>
         <strong>Phone:</strong> ${phone}<br/>
         <strong>Address:</strong> ${address}</p>
    </div>
  `;

    try {
      await this.transporter.sendMail({
        from: this.config.get("SMTP_FROM", "AutoMart <no-reply@automart.com>"),
        to: sellerEmail,
        subject: `New Order - ${orderId}`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send seller notification for ${orderId}`, err);
    }
  }

  async sendPreownedConfirmation(
    to: string,
    ownerName: string,
    listingId: string,
  ): Promise<void> {
    // Per spec: an email failure must never fail the API response. The
    // caller (ListingsService) invokes this without awaiting and catches
    // the rejection itself.
    await this.transporter.sendMail({
      from: "AutoMart <mail@auto-mart.co.in>",
      to,
      subject: "Your vehicle has been listed on AutoMart",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
          <h2>Hi ${escapeHtml(ownerName)},</h2>
          <p>Your pre-owned vehicle listing has been received successfully.</p>
          <p><strong>Listing ID:</strong> ${escapeHtml(listingId)}</p>
          <p>Our team will verify the details and your listing will go live shortly.</p>
          <p>&mdash; Team AutoMart</p>
        </div>
      `,
    });
  }

  async sendGarageConfirmation(
    to: string,
    ownerName: string,
    listingId: string,
  ): Promise<void> {
    // Per spec: an email failure must never fail the API response. The
    // caller (ListingsService) invokes this without awaiting and catches
    // the rejection itself.
    await this.transporter.sendMail({
      from: "AutoMart <mail@auto-mart.co.in>",
      to,
      subject: "Your garage has been listed on AutoMart",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
        <h2>Hi ${escapeHtml(ownerName)},</h2>
        <p>Your garage listing has been received successfully.</p>
        <p><strong>Listing ID:</strong> ${escapeHtml(listingId)}</p>
        <p>Our team will verify the details and your listing will go live shortly.</p>
        <p>&mdash; Team AutoMart</p>
      </div>
    `,
    });
  }

  async sendTechnicianConfirmation(
    to: string,
    fullName: string,
    listingId: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: "AutoMart <mail@auto-mart.co.in>",
      to,
      subject: "Your technician profile has been listed on AutoMart",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
        <h2>Hi ${escapeHtml(fullName)},</h2>
        <p>Your technician listing has been received successfully.</p>
        <p><strong>Listing ID:</strong> ${escapeHtml(listingId)}</p>
        <p>Our team will verify the details and your listing will go live shortly.</p>
        <p>&mdash; Team AutoMart</p>
      </div>
    `,
    });
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
