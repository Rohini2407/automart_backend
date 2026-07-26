import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("user")
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firstName", type: "varchar", length: 255 })
  firstName: string;

  @Column({ name: "lastName", type: "varchar", length: 255 })
  lastName: string;

  @Column({ type: "varchar", length: 255 })
  phone: string;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password: string;

  @Column({ type: "varchar", length: 255 })
  address: string;

  @Column({ type: "varchar", length: 255 })
  state: string;

  @Column({ type: "varchar", length: 255 })
  city: string;

  @Column({ type: "varchar", length: 255 })
  pincode: string;
}
