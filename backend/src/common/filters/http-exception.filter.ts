import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      // If service already threw a structured response, pass it through
      if (typeof res === "object" && (res as any).message) {
        const body = res as any;
        return response.status(status).json({
          status: body.status || String(status),
          message: Array.isArray(body.message) ? body.message[0] : body.message,
        });
      }

      message = typeof res === "string" ? res : message;
    } else {
      // TEMP: log the real exception so we can see what's actually being thrown
      console.error("Unhandled exception reached filter:", exception);
    }

    return response.status(status).json({
      status: String(status),
      message,
    });
  }
}
