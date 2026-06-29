import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("telecaller")
export class TelecallerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password: string; // MD5 hash
}
