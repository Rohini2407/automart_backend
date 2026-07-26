import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("product_images")
export class ProductImagesEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "product_id", type: "varchar", length: 100 })
  productId: string;

  // Relative path stored in DB, e.g. productimages/AMQUsample_0_20240514153022.jpg
  @Column({ name: "image", type: "varchar", length: 255 })
  imagePath: string;
}
