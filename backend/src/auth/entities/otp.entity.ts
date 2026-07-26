import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("otp")
export class OtpEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  otp: string;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 255 })
  type: string; // "user" | "seller"

  @CreateDateColumn({ name: "date", type: "datetime" })
  date: Date;
}
