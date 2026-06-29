import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("user")
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firstName", type: "varchar", length: 255, nullable: true })
  firstName: string;

  @Column({ name: "lastName", type: "varchar", length: 255, nullable: true })
  lastName: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string;

  @Column({ type: "varchar", length: 255 })
  password: string; // MD5 hash

  @Column({ name: "fcm_token", type: "varchar", length: 255, nullable: true })
  fcmToken: string;

  @Column({ name: "device_type", type: "varchar", length: 50, nullable: true })
  deviceType: string;
}
