import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("admin")
export class AdminEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password: string; // MD5 hash
}
