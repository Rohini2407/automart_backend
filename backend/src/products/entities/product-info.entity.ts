import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("product_info")
export class ProductInfoEntity {
  @PrimaryColumn({ name: "product_id", type: "varchar", length: 100 })
  productId: string;

  @Column({ name: "product_name", type: "varchar", length: 255 })
  productName: string;

  @Column({ name: "subTitle", type: "varchar", length: 255, nullable: true })
  subTitle: string | null;

  @Column({ name: "main_category", type: "varchar", length: 100 })
  mainCategory: string;

  @Column({ name: "sub_category", type: "varchar", length: 100 })
  subCategory: string;

  @Column({ name: "amount", type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({
    name: "discount_percentage",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  discountPercentage: number | null;

  @Column({
    name: "discount_amount",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  discountAmount: number | null;

  @Column({ name: "product_description", type: "text" })
  productDescription: string;

  @Column({ name: "color", type: "varchar", length: 50, nullable: true })
  color: string | null;

  @Column({ name: "brand", type: "varchar", length: 100, nullable: true })
  brand: string | null;

  @Column({ name: "seller", type: "varchar", length: 100 })
  seller: string;

  @Column({ name: "preturn", type: "varchar", length: 255, nullable: true })
  preturn: string | null;

  @Column({ name: "warranty", type: "varchar", length: 255, nullable: true })
  warranty: string | null;

  @Column({ name: "order_type", type: "varchar", length: 50, nullable: true })
  orderType: string | null;

  @Column({ name: "moq", type: "int", nullable: true })
  moq: number | null;

  @Column({ name: "stock_status", type: "varchar", length: 50 })
  stockStatus: string;

  @CreateDateColumn({ name: "create_date" })
  createDate: Date;

  @UpdateDateColumn({ name: "updated_date" })
  updatedDate: Date;
}
