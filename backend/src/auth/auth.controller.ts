import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from "@nestjs/swagger";

import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@ApiTags("Auth")
@ApiSecurity("app-key") // All auth routes require x-app-key
@Controller("") // prefix is "api" from global prefix → /api/login
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
          example: { message: "Login Successful", token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
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
}
