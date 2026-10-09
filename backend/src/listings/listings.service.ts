import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Listing,
  ListingDocuments,
  PreownedVehicleDetails,
} from "./entities/listing.entity";
import { CreatePreownedDto } from "./dto/create-preowned.dto";
import { MailService } from "src/common/mail/mail.service";
import {
  assertRequiredFiles,
  firstFile,
  generateTimestampedFilename,
  moveBufferToDisk,
  safeUnlink,
} from "src/common/utils/file-upload.util";
import {
  PreownedFiles,
  PREOWNED_IMAGE_FIELDS,
  PREOWNED_REQUIRED_FIELDS,
  GARAGE_UPLOAD_DIR,
  TechnicianFiles,
  TECHNICIAN_UPLOAD_DIR,
} from "./listings.constants";
import { CreateGarageDto } from "./dto/create-garage.dto";
import { CreateTechnicianDto } from "./dto/create-technician.dto";

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
    private readonly mailService: MailService,
  ) {}

  async createPreowned(dto: CreatePreownedDto, files: PreownedFiles) {
    assertRequiredFiles(files, PREOWNED_REQUIRED_FIELDS);

    const images = PREOWNED_IMAGE_FIELDS.map(
      (field) => firstFile(files, field)?.filename ?? null,
    ).filter((f): f is string => f !== null);

    const documents: ListingDocuments = {
      aadhar_front: firstFile(files, "aadhar_front")!.filename,
      rc_details: firstFile(files, "rc_details")!.filename,
    };

    const listingId = this.generateListingId(dto.vehicle_rto_number);

    const details: PreownedVehicleDetails = {
      vehicle_type: dto.vehicle_type,
      vehicle_brand: dto.vehicle_brand,
      vehicle_name: dto.vehicle_name,
      manufacturing_year: dto.manufacturing_year,
      model: dto.model,
      variant: dto.variant,
      vehicle_color: dto.vehicle_color,
      vehicle_rto_number: dto.vehicle_rto_number,
      number_of_owners: dto.number_of_owners,
      kilometer_driven: dto.kilometer_driven,
      insurance: dto.insurance,
      insurance_valid_till: dto.insurance_valid_till,
      insurance_type: dto.insurance_type,
      transmission_type: dto.transmission_type,
      price_expectations: dto.custom_price,
      description: dto.description,
    };

    const listing = this.listingsRepo.create({
      listing_type: "preowned_vehicle",
      listingId,
      name: dto.owner_name,
      email: dto.email,
      phone: dto.phone_number,
      whatsapp: dto.whatsapp_number ?? null,
      address: dto.address_line,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      images,
      documents,
      details,
      verification_status: "pending", // server-controlled — never trust client input for this
    });

    await this.listingsRepo.save(listing);

    // Fire-and-forget: matches the original spec ("email failure is caught
    // and logged silently, does not affect the response").
    this.mailService
      .sendPreownedConfirmation(dto.email, dto.owner_name, listingId)
      .catch((err) =>
        this.logger.warn(
          `Preowned confirmation email failed for ${dto.email}: ${err.message}`,
        ),
      );

    return { message: "Data added successfully", listingId };
  }

  /**
   * {vehicle_rto_number}{YmdHis in IST}, spaces stripped — matches the
   * original preownedid format exactly.
   */
  private generateListingId(rtoNumber: string): string {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp =
      `${ist.getUTCFullYear()}${pad(ist.getUTCMonth() + 1)}${pad(ist.getUTCDate())}` +
      `${pad(ist.getUTCHours())}${pad(ist.getUTCMinutes())}${pad(ist.getUTCSeconds())}`;
    return `${rtoNumber.replace(/\s+/g, "")}${stamp}`;
  }

  async createGarage(
    dto: CreateGarageDto,
    garagePhoto: Express.Multer.File | undefined,
  ) {
    if (!garagePhoto) {
      throw new BadRequestException("File not received or invalid!");
    }

    const filename = generateTimestampedFilename(
      "garage",
      garagePhoto.originalname,
    );
    await moveBufferToDisk(GARAGE_UPLOAD_DIR, filename, garagePhoto.buffer);

    const listingId = this.generateListingId(dto.contactNumber);

    const listing = this.listingsRepo.create({
      listing_type: "garage",
      listingId,
      name: dto.ownerName,
      businessName: dto.businessName,
      email: dto.emailId,
      phone: dto.contactNumber,
      whatsapp: dto.whatsappNumber ?? null,
      address: dto.businessAddress,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      images: [filename],
      details: {
        selectedVehicle: dto.selectedVehicle,
        selectedServices: dto.selectedServices,
        facilitiesDescription: dto.facilitiesDescription,
        openingHours: dto.openingHours,
        closingHours: dto.closingHours,
        businessLocation: dto.businessLocation,
        gstNumber: dto.gstNumber,
        shopActNumber: dto.shopActNumber,
      },
      verification_status: "pending",
    });

    await this.listingsRepo.save(listing);

    this.mailService
      .sendGarageConfirmation(dto.emailId, dto.ownerName, listingId)
      .catch((err) =>
        this.logger.warn(
          `Garage confirmation email failed for ${dto.emailId}: ${err.message}`,
        ),
      );

    return { message: "Garage Listed successfully!" };
  }

  // inside ListingsService:
  async createTechnician(dto: CreateTechnicianDto, files: TechnicianFiles) {
    const profilePhoto = files?.profilePhoto?.[0];
    const aadharCardImage = files?.aadharCardImage?.[0];

    // Unlike the legacy PHP (which only caught "both null"), each file is
    // validated independently — a single missing file returns a clean 400
    // instead of crashing on getClientExtension() of null.
    if (!profilePhoto || !aadharCardImage) {
      throw new BadRequestException("File not received or invalid!");
    }

    const profileFilename = generateTimestampedFilename(
      "tech",
      profilePhoto.originalname,
    );
    const aadharFilename = generateTimestampedFilename(
      "techaadhar",
      aadharCardImage.originalname,
    );

    const profilePath = await moveBufferToDisk(
      TECHNICIAN_UPLOAD_DIR,
      profileFilename,
      profilePhoto.buffer,
    );

    let aadharPath: string;
    try {
      aadharPath = await moveBufferToDisk(
        TECHNICIAN_UPLOAD_DIR,
        aadharFilename,
        aadharCardImage.buffer,
      );
    } catch (err) {
      // profilePhoto already landed on disk — don't leave it orphaned
      await safeUnlink(profilePath);
      throw err;
    }

    const listingId = this.generateListingId(dto.phone);

    const listing = this.listingsRepo.create({
      listing_type: "technician",
      listingId,
      name: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      whatsapp: dto.whatsapp ?? null,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      images: [profileFilename],
      documents: { aadharCardImage: aadharFilename },
      details: {
        about: dto.about,
        workType: dto.workType,
      },
      verification_status: "pending",
    });

    await this.listingsRepo.save(listing);

    this.mailService
      .sendTechnicianConfirmation(dto.email, dto.fullName, listingId)
      .catch((err) =>
        this.logger.warn(
          `Technician confirmation email failed for ${dto.email}: ${err.message}`,
        ),
      );

    return { message: "Technician Listed successfully!" };
  }
}
