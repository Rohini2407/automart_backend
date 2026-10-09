import { DeviceType } from "src/common/enums/deviceType";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type SiteContentType =
  | "lead_seller_demo"
  | "lead_bulk_enquiry"
  | "lead_contact_us"
  | "lead_feedback"
  | "banner_slider"
  | "banner_sponsor"
  | "shipping_rate"
  | "excluded_pincode"
  | "search_log";

export type SliderDevice = "mobile" | "tablet" | "desktop";

@Entity("site_content")
export class SiteContentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: "content_type",
    type: "enum",
    enum: [
      "lead_seller_demo",
      "lead_bulk_enquiry",
      "lead_contact_us",
      "lead_feedback",
      "banner_slider",
      "banner_sponsor",
      "shipping_rate",
      "excluded_pincode",
      "search_log",
    ],
  })
  contentType: SiteContentType;

  @Column({ nullable: true }) firstName?: string;
  @Column({ nullable: true }) lastName?: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ nullable: true }) email?: string;
  @Column({ name: "gstNumber", nullable: true }) gstNumber?: string;
  @Column({ type: "text", nullable: true }) message?: string;

  @Column({ nullable: true }) image?: string;
  @Column({ name: "imageLink", nullable: true }) imageLink?: string;

  @Column({ type: "enum", enum: DeviceType, nullable: true })
  device?: DeviceType;

  @Column({ name: "text_value", nullable: true }) textValue?: string;
  @Column({
    name: "numeric_key",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  numericKey?: number;
  @Column({
    name: "numeric_value",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  numericValue?: number;

  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}
