import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("products")
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "product_id", type: "varchar", length: 100, unique: true })
  productId: string;

  @Column({ name: "product_name", type: "varchar", length: 355 })
  productName: string;

  @Column({ name: "subTitle", type: "varchar", length: 255 })
  subTitle: string;

  @Column({ name: "main_category", type: "varchar", length: 100 })
  mainCategory: string;

  @Column({ name: "sub_category", type: "varchar", length: 100 })
  subCategory: string;

  @Column({ type: "varchar", length: 50 })
  color: string;

  @Column({ type: "varchar", length: 100 })
  brand: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({
    name: "discount_percentage",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercentage: number;

  @Column({
    name: "discount_amount",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({ name: "product_description", type: "text" })
  productDescription: string;

  @Column({ type: "int", default: 0 })
  stock: number;

  @Column({
    name: "stock_status",
    type: "enum",
    enum: ["in_stock", "out_of_stock", "low_stock"],
    default: "in_stock",
  })
  stockStatus: string;

  @Column({ type: "enum", enum: ["yes", "no"], default: "no" })
  preturn: string;

  @Column({ type: "varchar", length: 100 })
  warranty: string;

  @Column({ type: "varchar", length: 255 })
  seller: string;

  @Column({ type: "decimal", precision: 8, scale: 2 })
  actualweight: number;

  @Column({ name: "finalWeight", type: "decimal", precision: 8, scale: 2 })
  finalWeight: number;

  @Column({ type: "decimal", precision: 8, scale: 2 })
  length: number;

  @Column({ type: "decimal", precision: 8, scale: 2 })
  width: number;

  @Column({ type: "decimal", precision: 8, scale: 2 })
  height: number;

  @Column({ name: "volumetricWeight", type: "decimal", precision: 8, scale: 2 })
  volumetricWeight: number;

  @Column({ name: "fuelType", type: "varchar", length: 50 })
  fuelType: string;

  @Column({ name: "transmissionType", type: "varchar", length: 50 })
  transmissionType: string;

  @Column({ name: "hsnCode", type: "varchar", length: 20 })
  hsnCode: string;

  @Column({ name: "gstPercentage", type: "decimal", precision: 5, scale: 2 })
  gstPercentage: number;

  @Column({ name: "expectedPrice", type: "decimal", precision: 10, scale: 2 })
  expectedPrice: number;

  @Column({ name: "gstPrice", type: "decimal", precision: 10, scale: 2 })
  gstPrice: number;

  @Column({
    name: "indirectFee",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  indirectFee: number;

  @Column({
    name: "platformFee",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  platformFee: number;

  @Column({
    name: "shippingCharges",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  shippingCharges: number;

  @Column({ type: "varchar", length: 100 })
  partnumber: string;

  @Column({ name: "vehicleName", type: "varchar", length: 255 })
  vehicleName: string;

  @Column({ name: "vehicleVariant", type: "varchar", length: 100 })
  vehicleVariant: string;

  @Column({ name: "vehicleBrand", type: "varchar", length: 100 })
  vehicleBrand: string;

  @Column({ type: "varchar", length: 100 })
  materialtype: string;

  @Column({
    name: "productStatus",
    type: "enum",
    enum: ["active", "inactive", "draft"],
    default: "draft",
  })
  productStatus: string;

  @Column({ type: "varchar", length: 255, default: "" })
  remark: string;

  // Replaces the old `product_images` table — array of relative paths.
  @Column({ type: "json", nullable: true })
  images: string[] | null;

  @Column({ name: "update_history", type: "text", nullable: true })
  updateHistory: string | null;

  @CreateDateColumn({ name: "create_date" })
  createDate: Date;

  @UpdateDateColumn({ name: "updated_date" })
  updatedDate: Date;
}
