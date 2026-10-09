import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  UploadedFile,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from "@nestjs/platform-express";
import {
  ApiTags,
  ApiConsumes,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreatePreownedDto } from "./dto/create-preowned.dto";
import { ListingsService } from "./listings.service";
import {
  garageMulterOptions,
  PREOWNED_FILE_FIELDS,
  PreownedFiles,
  preownedMulterOptions,
  TECHNICIAN_FILE_FIELDS,
  TechnicianFiles,
  technicianMulterOptions,
} from "./listings.constants";
import { CreateGarageDto } from "./dto/create-garage.dto";
import { CreateTechnicianDto } from "./dto/create-technician.dto";

@ApiTags("Listings")
@ApiBearerAuth("access-token")
@Controller("api/user")
@UseGuards(JwtAuthGuard) // equivalent to the original middleware `authFilter`
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // NOTE: the original route was `POST /addpreowned/:any` with an unused
  // wildcard segment — it was dead weight, so it's dropped here. If some
  // client still calls the old path with a trailing segment, add
  // `@Post('addpreowned/:any')` back as an alias.
  @Post("addpreowned")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: [
        "owner_name",
        "email",
        "phone_number",
        "address_line",
        "state",
        "city",
        "pincode",
        "vehicle_type",
        "vehicle_brand",
        "vehicle_name",
        "manufacturing_year",
        "vehicle_rto_number",
        "aadhar_front",
        "rc_details",
      ],
      properties: {
        owner_name: { type: "string" },
        email: { type: "string" },
        phone_number: { type: "string" },
        whatsapp_number: { type: "string" },
        address_line: { type: "string" },
        state: { type: "string" },
        city: { type: "string" },
        pincode: { type: "string" },
        vehicle_type: { type: "string" },
        vehicle_brand: { type: "string" },
        vehicle_name: { type: "string" },
        manufacturing_year: { type: "string" },
        model: { type: "string" },
        variant: { type: "string" },
        vehicle_color: { type: "string" },
        vehicle_rto_number: { type: "string" },
        number_of_owners: { type: "number" },
        kilometer_driven: { type: "number" },
        insurance: { type: "string", enum: ["yes", "no"] },
        insurance_type: { type: "string" },
        insurance_valid_till: { type: "string" },
        transmission_type: { type: "string", enum: ["Manual", "Automatic"] },
        custom_price: { type: "number" },
        description: { type: "string" },
        image0: { type: "string", format: "binary" },
        image1: { type: "string", format: "binary" },
        image2: { type: "string", format: "binary" },
        image3: { type: "string", format: "binary" },
        image4: { type: "string", format: "binary" },
        aadhar_front: { type: "string", format: "binary" },
        rc_details: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(PREOWNED_FILE_FIELDS, preownedMulterOptions),
  )
  async addPreowned(
    @Body() dto: CreatePreownedDto,
    @UploadedFiles() files: PreownedFiles,
  ) {
    return this.listingsService.createPreowned(dto, files);
  }

  @Post("addgarage")
  @ApiOperation({ summary: "Register a new garage/auto service business" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: [
        "garagePhoto",
        "ownerName",
        "contactNumber",
        "emailId",
        "businessName",
        "businessAddress",
        "city",
        "state",
        "pincode",
      ],
      properties: {
        garagePhoto: { type: "string", format: "binary" },
        ownerName: { type: "string" },
        contactNumber: { type: "string" },
        whatsappNumber: { type: "string" },
        emailId: { type: "string" },
        businessName: { type: "string" },
        selectedVehicle: { type: "string" },
        selectedServices: { type: "string" },
        facilitiesDescription: { type: "string" },
        openingHours: { type: "string" },
        closingHours: { type: "string" },
        businessAddress: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        pincode: { type: "string" },
        businessLocation: { type: "string" },
        gstNumber: { type: "string" },
        shopActNumber: { type: "string" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("garagePhoto", garageMulterOptions))
  async addGarage(
    @UploadedFile() garagePhoto: Express.Multer.File,
    @Body() dto: CreateGarageDto,
  ) {
    return this.listingsService.createGarage(dto, garagePhoto);
  }

  @Post("addtechnician")
  @ApiOperation({ summary: "Register a new technician" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: [
        "profilePhoto",
        "aadharCardImage",
        "fullName",
        "phone",
        "email",
        "address",
        "city",
        "state",
        "pincode",
      ],
      properties: {
        profilePhoto: { type: "string", format: "binary" },
        aadharCardImage: { type: "string", format: "binary" },
        fullName: { type: "string" },
        phone: { type: "string" },
        whatsapp: { type: "string" },
        email: { type: "string" },
        about: { type: "string" },
        workType: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        pincode: { type: "string" },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(TECHNICIAN_FILE_FIELDS, technicianMulterOptions),
  )
  async addTechnician(
    @UploadedFiles() files: TechnicianFiles,
    @Body() dto: CreateTechnicianDto,
  ) {
    return this.listingsService.createTechnician(dto, files);
  }
}
