import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

// ⚠ Adjust to where your entity / mail service / enums live
import { SiteContentEntity } from "../site-content/entities/site-content.entity";
import { MailService } from "../common/mail/mail.service";
import { LeadType } from "../common/enums/leadType";

import { CreateContactUsDto } from "./dto/create-contact-us.dto";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { CreateBulkEnquiryDto } from "./dto/create-bulk-inquiry.dto";

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(SiteContentEntity)
    private readonly repo: Repository<SiteContentEntity>,
    private readonly mailService: MailService,
  ) {}

  async submitBulkEnquiry(dto: CreateBulkEnquiryDto) {
    await this.save(LeadType.BULK_ENQUIRY, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      gstNumber: dto.gstNumber,
      message: dto.description, // description -> message column
    });
    this.notify(
      dto.email,
      this.mailService.sendBulkEnquiryAck(dto.email, dto.firstName),
    );
    return { message: "Bulkenquiry Submit Successfully!" };
  }

  async submitContactUs(dto: CreateContactUsDto) {
    await this.save(LeadType.CONTACT_US, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      message: dto.message,
    });
    this.notify(
      dto.email,
      this.mailService.sendContactUsAck(dto.email, dto.firstName),
    );
    return { message: "Message Submit Successfully!" };
  }

  async submitFeedback(dto: CreateFeedbackDto) {
    await this.save(LeadType.FEEDBACK, {
      firstName: dto.name, // full name stored in firstName (site_content has no `name` column)
      phone: dto.phone,
      email: dto.email,
      message: dto.message,
    });
    this.notify(
      dto.email,
      this.mailService.sendFeedbackThanks(dto.email, dto.name),
    );
    return { message: "feedback Submit Successfully!" };
  }

  // ───────────────────────── helpers ─────────────────────────

  private async save(
    contentType: LeadType,
    data: Partial<SiteContentEntity>,
  ): Promise<void> {
    try {
      await this.repo.save(this.repo.create({ ...data, contentType }));
    } catch (err) {
      this.logger.error(
        `Failed to insert ${contentType}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        "Unable to submit your request. Please try again later.",
      );
    }
  }

  /** Fire-and-forget: an email failure must never fail the API response. */
  private notify(to: string, sending: Promise<void>): void {
    sending.catch((e: Error) =>
      this.logger.error(`Ack email to ${to} failed: ${e.message}`, e.stack),
    );
  }
}
