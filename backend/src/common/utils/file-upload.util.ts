import {
  BadRequestException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { randomBytes } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";

function istTimestamp(): string {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    now.getUTCFullYear().toString() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds())
  );
}

export const DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/** Multer options for a named set of document uploads, with MIME/size validation
 * (the legacy PHP `regseller` endpoint had none — any file type/size was accepted). */
export function multerOptionsFor(
  destinationSubdir: string,
  allowedMimeTypes: string[],
  maxSizeBytes: number,
  filenamePrefixFor: (fieldname: string) => string,
) {
  const uploadRoot = process.env.UPLOAD_ROOT || "./assets/uploads";
  return {
    storage: diskStorage({
      destination: `${uploadRoot}/${destinationSubdir}`,
      filename: (req, file, callback) => {
        const prefix = filenamePrefixFor(file.fieldname);
        const suffix = randomBytes(2).toString("hex");
        const ext = extname(file.originalname).toLowerCase();
        callback(null, `${prefix}_${istTimestamp()}_${suffix}${ext}`);
      },
    }),
    limits: { fileSize: maxSizeBytes },
    fileFilter: (req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        callback(
          new BadRequestException(
            `Invalid file type for "${file.fieldname}". Allowed: ${allowedMimeTypes.join(", ")}`,
          ),
          false,
        );
        return;
      }
      callback(null, true);
    },
  };
}

/** Fixes the legacy bug: regseller assumed all 4 docs were present with no
 * null check, throwing a raw PHP error (`getExtension() on null`) if any
 * were missing. Each field is now checked explicitly. */
export function assertRequiredFiles(
  files: Record<string, Express.Multer.File[]> | undefined,
  requiredFields: string[],
): void {
  const missing = requiredFields.filter((f) => !files?.[f]?.[0]);
  if (missing.length > 0) {
    throw new BadRequestException(
      `Missing required file(s): ${missing.join(", ")}`,
    );
  }
}

export function firstFile(
  files: Record<string, Express.Multer.File[]> | undefined,
  field: string,
): Express.Multer.File | undefined {
  return files?.[field]?.[0];
}

const moveLogger = new Logger("FileUploadUtil");

/** `{prefix}{YmdHis}.{ext}` in IST — matches the exact legacy naming pattern
 * used by slider/garage/technician uploads (distinct from preowned's
 * `multerOptionsFor` convention above, which uses a random suffix). */
export function generateTimestampedFilename(
  prefix: string,
  originalName: string,
): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${ist.getUTCFullYear()}${pad(ist.getUTCMonth() + 1)}${pad(ist.getUTCDate())}` +
    `${pad(ist.getUTCHours())}${pad(ist.getUTCMinutes())}${pad(ist.getUTCSeconds())}`;
  const ext = originalName.slice(originalName.lastIndexOf(".")) || "";
  return `${prefix}${stamp}${ext}`;
}

/** Writes a memoryStorage buffer to disk, mapping failure/collision to the
 * 401 responses these legacy endpoints (slider, garage, technician) expect. */
export async function moveBufferToDisk(
  dir: string,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  await mkdir(dir, { recursive: true });
  const targetPath = join(dir, filename);

  if (existsSync(targetPath)) {
    throw new UnauthorizedException(
      "File is not valid or has already been moved!",
    );
  }

  try {
    await writeFile(targetPath, buffer);
  } catch (err) {
    moveLogger.error(
      `File write failed for ${filename}: ${(err as Error).message}`,
    );
    throw new UnauthorizedException("Failed to move the file!");
  }

  return targetPath; // now returns the path instead of void
}

export async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // already gone or never existed — nothing to do
  }
}