import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Headers,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiHeader,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";

import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegistrationService } from "./registration.service";
import { Public } from "src/common/decorators/public.decorator";
import { RegistrationDto } from "./dto/registration.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { SetPasswordDto } from "./dto/set-password.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { RegisterSellerDto } from "./dto/register-seller.dto";
import { assertRequiredFiles, DOCUMENT_MIME_TYPES, firstFile, MAX_DOCUMENT_SIZE_BYTES, multerOptionsFor } from "src/common/utils/file-upload.util";
import { FileFieldsInterceptor } from "@nestjs/platform-express";

type FileMap = Record<string, Express.Multer.File[]>;
const SELLER_REQUIRED_DOCS = [
  "personalProof",
  "businessAddressProof",
  "gstDocument",
  "bankProof",
];

@ApiTags("Auth")
@ApiSecurity("app-key") // All auth routes require x-app-key
@Controller("") // prefix is "api" from global prefix → /api/login
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registrationService: RegistrationService,
  ) {}

  /**
   * POST /api/login
   * Unified login — tries Admin → User → Seller → Marketing → Telecaller
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Unified Login",
    description:
      "Tries credentials sequentially across: **Admin → User → Seller → Marketing → Telecaller**.\n\n" +
      "Returns a 30-day JWT on first match.\n\n" +
      "Password is MD5-hashed before DB comparison.\n\n" +
      "Inserts a row in the `auth` table on success.",
  })
  @ApiResponse({
    status: 200,
    description: "Login Successful",
    schema: {
      oneOf: [
        {
          title: "Admin / Seller / Marketing / Telecaller",
          example: {
            message: "Login Successful",
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
        {
          title: "User",
          example: {
            message: "Login Successful",
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            totalQuantity: 3,
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
    schema: {
      example: { status: "401", message: "Invalid credentials" },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Missing required fields",
    schema: {
      example: { status: "404", message: "Please enter data" },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // ─── POST /api/user/registration ────────────────────────────────────────────
  @Public()
  @Post("user/registration")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Register a new buyer/user account" })
  @ApiResponse({
    status: 200,
    description: "Register Successful",
    schema: {
      example: {
        status: "200",
        message: "Register Successful",
        token: "eyJ...",
        totalQuantity: 0,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Validation Error – email or phone already exists",
    schema: {
      example: {
        status: "401",
        message: "Validation Error",
        errors: { email: "This email is already registered" },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: "Conflict – already registered as a seller",
    schema: {
      example: {
        status: "409",
        message: "This email/phone is already registered as a seller.",
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: "Internal Error – registration failed",
  })
  async register(@Body() dto: RegistrationDto) {
    return this.registrationService.register(dto);
  }

  @Public()
  @Post("forgotpassword")
  @ApiOperation({ summary: "Send password reset OTP to registered email" })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post("setpassword")
  @ApiOperation({ summary: "Verify OTP and reset password" })
  async setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPassword(dto);
  }

  // ─── POST /api/googlelogin ──────────────────────────────────────────────
  @Public() // bypasses JwtAuthGuard — still runs behind appauth/cors filters
  @Post("googlelogin")
  @HttpCode(200)
  @ApiOperation({
    summary: "Google OAuth login/registration",
    description:
      "Checks user table, then seller table, then auto-registers a new user.",
  })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  // ─── POST /api/logout ───────────────────────────────────────────────────
  @Post("logout")
  @HttpCode(200)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Delete the current session token" })
  @ApiHeader({ name: "Authorization", description: "Bearer <JWT token>" })
  async logout(@Headers("authorization") authHeader: string) {
    const token = this.extractBearerToken(authHeader);
    return this.authService.logout(token);
  }

  // ─── POST /api/logoutforall ──────────────────────────────────────────────
  @Post("logoutforall")
  @HttpCode(200)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Delete all sessions for the current user" })
  async logoutForAll(@Headers("authorization") authHeader: string) {
    const token = this.extractBearerToken(authHeader);
    return this.authService.logoutForAll(token);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private extractBearerToken(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token not provided");
    }
    return authHeader.slice("Bearer ".length).trim();
  }

  // ─── POST /api/seller/registration ──────────────────────────────────────
  // NOTE: legacy route was `POST /api/regseller`. Renamed to match the
  // `user/registration` convention already in this controller — if any
  // existing client is hardcoded to `/api/regseller`, either rename this
  // back or add a second @Post("regseller") pointing at the same handler.
  @Public()
  @Post("seller/registration")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Register a new seller account",
    description:
      "Requires 4 KYC documents (personalProof, businessAddressProof, gstDocument, bankProof). " +
      "Account is created with status='pending' — seller cannot log in until an admin approves it.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Seller registration — all fields plus 4 KYC document files",
    schema: {
      type: "object",
      required: [
        "firstName",
        "businessName",
        "phone",
        "email",
        "address",
        "city",
        "state",
        "pincode",
        "bankAccountName",
        "accountNumber",
        "ifscCode",
        "password",
        "personalProof",
        "businessAddressProof",
        "gstDocument",
        "bankProof",
      ],
      properties: {
        firstName: { type: "string", example: "Rahul" },
        lastName: { type: "string", example: "Kumar" },
        businessName: { type: "string", example: "Kumar Auto Traders" },
        phone: { type: "string", example: "9876543210" },
        whatsapp: { type: "string", example: "9876543210" },
        email: { type: "string", example: "rahul.kumar@example.com" },
        address: { type: "string", example: "12 MG Road, Shivaji Nagar" },
        city: { type: "string", example: "Pune" },
        state: { type: "string", example: "Maharashtra" },
        pincode: { type: "string", example: "411001" },
        gstNumber: { type: "string", example: "27AAAPL1234C1Z5" },
        shopActNumber: { type: "string", example: "SA-2023-00123" },
        iecNumber: { type: "string", example: "IEC1234567890" },
        bankAccountName: { type: "string", example: "Rahul Kumar" },
        accountNumber: { type: "string", example: "123456789012" },
        ifscCode: { type: "string", example: "HDFC0001234" },
        password: { type: "string", example: "StrongPass@123" },
        sellerType: {
          type: "string",
          enum: ["individual", "business"],
          example: "individual",
        },
        personalProof: { type: "string", format: "binary" },
        businessAddressProof: { type: "string", format: "binary" },
        gstDocument: { type: "string", format: "binary" },
        bankProof: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      SELLER_REQUIRED_DOCS.map((name) => ({ name, maxCount: 1 })),
      multerOptionsFor(
        "seller-docs",
        DOCUMENT_MIME_TYPES,
        MAX_DOCUMENT_SIZE_BYTES,
        (field) => field,
      ),
    ),
  )
  @ApiResponse({
    status: 200,
    description: "Seller Registration Successfully!",
    schema: {
      example: {
        status: "200",
        message: "Seller Registration Successfully!",
        sellerId: "AMRK3210",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Missing required document(s)" })
  @ApiResponse({
    status: 409,
    description: "Conflict – email already registered",
    schema: {
      example: {
        status: "409",
        message: "This email is already registered as a seller.",
      },
    },
  })
  async registerSeller(
    @Body() dto: RegisterSellerDto,
    @UploadedFiles() files: FileMap,
  ) {
    assertRequiredFiles(files, SELLER_REQUIRED_DOCS);
    return this.registrationService.registerSeller(dto, {
      personalProof: firstFile(files, "personalProof")!,
      businessAddressProof: firstFile(files, "businessAddressProof")!,
      gstDocument: firstFile(files, "gstDocument")!,
      bankProof: firstFile(files, "bankProof")!,
    });
  }
}
