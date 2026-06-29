import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("marketing")
export class MarketingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password: string; // MD5 hash
}
