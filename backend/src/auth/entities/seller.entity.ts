import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("seller")
export class SellerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firstName", type: "varchar", length: 255, nullable: true })
  firstName: string;

  @Column({ name: "lastName", type: "varchar", length: 255, nullable: true })
  lastName: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password: string; // MD5 hash

  @Column({ name: "acc_status", type: "varchar", length: 50, default: "pending" })
  accStatus: string; // must be "verified" to login
}
