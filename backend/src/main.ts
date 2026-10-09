import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Global Prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix("api");

  // ─── Global Validation Pipe ─────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-app-key"],
  });

  // ─── Swagger Setup ──────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle("AutoMart API")
    .setDescription(
      "AutoMart Backend API Documentation\n\n" +
        "**Base URL (via Middleware):** http://localhost:3000\n\n" +
        "**Auth:** Bearer JWT token — 30 day expiry\n\n" +
        "**Password Hashing:** MD5\n\n" +
        "All protected routes require `Authorization: Bearer <token>` header.",
    )
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT", in: "header" },
      "access-token",
    )
    .addApiKey({ type: "apiKey", name: "x-app-key", in: "header" }, "app-key")
    .addServer("http://localhost:4000", "Backend Direct")
    .addServer("http://localhost:3000", "Via Middleware")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });

  const PORT = process.env.PORT || 4000;
  await app.listen(PORT);

  console.log(`✅  Backend running on     http://localhost:${PORT}`);
  console.log(`📚  Swagger Docs at        http://localhost:${PORT}/docs`);
}

bootstrap();
