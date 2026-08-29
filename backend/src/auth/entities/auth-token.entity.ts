import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRole } from "./user.entity";

export type TokenType = "otp" | "session";
export type OtpPurpose = "forgot_password" | "email_verify" | "login";
export type DeviceType = "android" | "ios" | "web";

/**
 * Replaces: AuthEntity (device/session metadata) + OtpEntity.
 * `token_type` distinguishes the two former tables' rows.
 */
@Entity("auth_tokens")
export class AuthTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ name: "token_type", type: "enum", enum: ["otp", "session"] })
  tokenType: TokenType;

  @Column({
    type: "enum",
    enum: ["customer", "seller", "admin", "telecaller", "marketing"],
    nullable: true,
  })
  usertype: UserRole | null;

  @Column({ name: "otp_code", type: "varchar", length: 10, nullable: true })
  otpCode: string | null;

  @Column({
    name: "otp_purpose",
    type: "enum",
    enum: ["forgot_password", "email_verify", "login"],
    nullable: true,
  })
  otpPurpose: OtpPurpose | null;

  @Column({ name: "fcm_token", type: "varchar", length: 255, nullable: true })
  fcmToken: string | null;

  @Column({
    name: "device_type",
    type: "enum",
    enum: ["android", "ios", "web"],
    nullable: true,
  })
  deviceType: DeviceType | null;

  @Column({ name: "expires_at", type: "datetime", nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
