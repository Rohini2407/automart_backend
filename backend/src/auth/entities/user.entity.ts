import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type UserRole =
  | "customer"
  | "admin"
  | "seller"
  | "telecaller"
  | "marketing";
export type SellerType = "individual" | "business";
export type AccountStatus = "active" | "inactive" | "pending";

export interface UserDocuments {
  personalProof?: string;
  businessAddressProof?: string;
  gstDocument?: string;
  bankProof?: string;
}

export interface CartItem {
  product_id: string;
  quantity: number;
}

/**
 * Replaces: AdminEntity, UserEntity (old), SellerEntity, MarketingEntity,
 * TelecallerEntity — all now rows in `users`, distinguished by `role`.
 *
 * MIGRATION NOTE: admin/marketing/telecaller previously had a single
 * `name` column. That value now lives in `firstName`, with `lastName`
 * left null for those roles. See auth.service.ts buildToken() for how
 * the JWT payload reassembles a display name for those roles.
 */
@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: ["customer", "admin", "seller", "telecaller", "marketing"],
    default: "customer",
  })
  role: UserRole;

  @Column({ name: "externalId", type: "varchar", length: 100, nullable: true })
  externalId: string | null;

  @Column({
    name: "sellerType",
    type: "enum",
    enum: ["individual", "business"],
    nullable: true,
  })
  sellerType: SellerType | null;

  @Column({
    name: "businessName",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  businessName: string | null;

  @Column({ name: "firstName", type: "varchar", length: 100, nullable: true })
  firstName: string | null;

  @Column({ name: "lastName", type: "varchar", length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  whatsapp: string | null;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  password: string | null;

  @Column({ type: "text", nullable: true })
  address: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  state: string | null;

  @Column({ type: "varchar", length: 10, nullable: true })
  pincode: string | null;

  @Column({ name: "gstNumber", type: "varchar", length: 15, nullable: true })
  gstNumber: string | null;

  @Column({
    name: "shopActNumber",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  shopActNumber: string | null;

  @Column({ name: "iecNumber", type: "varchar", length: 50, nullable: true })
  iecNumber: string | null;

  @Column({
    name: "bankAccountName",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  bankAccountName: string | null;

  @Column({
    name: "accountNumber",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  accountNumber: string | null;

  @Column({ name: "ifscCode", type: "varchar", length: 20, nullable: true })
  ifscCode: string | null;

  /** { personalProof, businessAddressProof, gstDocument, bankProof } */
  @Column({ type: "json", nullable: true })
  documents: UserDocuments | null;

  @Column({
    type: "enum",
    enum: ["active", "inactive", "pending"],
    default: "active",
  })
  status: AccountStatus;

  /** [{ product_id, quantity }] — customer role only in practice */
  @Column({ type: "json", nullable: true })
  cart: CartItem[] | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
