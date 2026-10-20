import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseInterceptors,
} from "@nestjs/common";
import { NoFilesInterceptor } from "@nestjs/platform-express";
import {
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { Public } from "../common/decorators/public.decorator"; 
import { LeadsService } from "./leads.service";
import { CreateContactUsDto } from "./dto/create-contact-us.dto";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { CreateBulkEnquiryDto } from "./dto/create-bulk-inquiry.dto";

const CONSUMES = [
  "application/json",
  "multipart/form-data",
  "application/x-www-form-urlencoded",
] as const;

/**
 * Public (no JWT) endpoints. `x-app-key` is enforced by the middleware (appauth).
 * No controller prefix: global prefix "api" gives /api/bulkenquiry, /api/contactus, /api/feedback.
 * Validation: handled by the global ValidationPipe in main.ts.
 */
@ApiTags("Leads")
@ApiSecurity("app-key")
@Public()
@Controller()
@UseInterceptors(NoFilesInterceptor()) // allows multipart/form-data with text fields only
@Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 req/min per IP
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post("bulkenquiry")
  @HttpCode(200)
  @ApiOperation({ summary: "Submit a bulk purchase enquiry" })
  @ApiConsumes(...CONSUMES)
  @ApiOkResponse({
    schema: { example: { message: "Bulkenquiry Submit Successfully!" } },
  })
  bulkEnquiry(@Body() dto: CreateBulkEnquiryDto) {
    return this.leads.submitBulkEnquiry(dto);
  }

  @Post("contactus")
  @HttpCode(200)
  @ApiOperation({ summary: "Submit a contact-us message" })
  @ApiConsumes(...CONSUMES)
  @ApiOkResponse({
    schema: { example: { message: "Message Submit Successfully!" } },
  })
  contactUs(@Body() dto: CreateContactUsDto) {
    return this.leads.submitContactUs(dto);
  }

  @Post("feedback")
  @HttpCode(200)
  @ApiOperation({
    summary: "Submit user feedback (single `name` field, not firstName)",
  })
  @ApiConsumes(...CONSUMES)
  @ApiOkResponse({
    schema: { example: { message: "feedback Submit Successfully!" } },
  })
  feedback(@Body() dto: CreateFeedbackDto) {
    return this.leads.submitFeedback(dto);
  }
}
