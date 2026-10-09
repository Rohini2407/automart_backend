import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

export type ListingType = "preowned_vehicle" | "garage" | "technician";
export type VerificationStatus = "pending" | "verified" | "rejected";

export interface PreownedVehicleDetails {
  vehicle_type: string;
  vehicle_brand: string;
  vehicle_name: string;
  manufacturing_year: string;
  model?: string;
  variant?: string;
  vehicle_color?: string;
  vehicle_rto_number: string;
  number_of_owners?: number;
  kilometer_driven?: number;
  insurance?: string;
  insurance_valid_till?: string;
  insurance_type?: string;
  transmission_type?: string;
  price_expectations?: number;
  description?: string;
}

export interface ListingDocuments {
  aadhar_front?: string;
  rc_details?: string;
  aadharCardImage?: string;
}

@Entity("listings")
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: ["preowned_vehicle", "garage", "technician"] })
  listing_type: ListingType;

  @Index({ unique: true })
  @Column({ length: 100, nullable: true })
  listingId: string;

  @Column({ length: 255 })
  name: string; // owner_name

  @Column({ length: 255, nullable: true })
  businessName: string | null; // unused for preowned_vehicle

  @Index()
  @Column({ length: 255, nullable: true })
  email: string | null;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ length: 20, nullable: true })
  whatsapp: string | null;

  @Column({ type: "text", nullable: true })
  address: string | null;

  @Column({ length: 100, nullable: true })
  city: string | null;

  @Column({ length: 100, nullable: true })
  state: string | null;

  @Column({ length: 10, nullable: true })
  pincode: string | null;

  @Column({ type: "json", nullable: true })
  images: string[] | null; // vehicle photos

  @Column({ type: "json", nullable: true })
  documents: ListingDocuments | null; // aadhar_front, rc_details

  @Column({ type: "json", nullable: true })
  details: PreownedVehicleDetails | Record<string, any> | null;

  @Column({
    type: "enum",
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  })
  verification_status: VerificationStatus;

  @CreateDateColumn()
  created_at: Date;
}
