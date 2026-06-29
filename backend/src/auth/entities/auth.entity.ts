import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("auth")
export class AuthEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 255 })
  usertype: string;

  @Column({ type: "longtext" })
  token: string;

  @Column({ name: "fcm_token", type: "varchar", length: 255, nullable: true })
  fcmToken: string;

  @Column({ name: "device_type", type: "varchar", length: 255, nullable: true })
  deviceType: string;

  @CreateDateColumn({ name: "date" })
  date: Date;
}
