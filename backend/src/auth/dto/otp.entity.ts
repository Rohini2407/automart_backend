import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";

@Entity("otp")
export class OtpEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 6 })
  otp: string;

  @Column({ type: "enum", enum: ["user", "seller"] })
  type: "user" | "seller";

  @Column({ type: "varchar" })
  email: string;

  @CreateDateColumn()
  createdAt: Date;
}
