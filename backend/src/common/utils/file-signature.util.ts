import { join } from "path";

export interface DetectedFile {
  mime: string;
  ext: string;
}

/**
 * Detects the real file type from its first bytes ("magic numbers").
 * Multer's `mimetype` and `originalname` are client-supplied and can be faked,
 * so we never trust them for deciding what a file is or what extension it gets.
 */
export function detectFileType(buf: Buffer | undefined): DetectedFile | null {
  if (!buf || buf.length < 12) return null;

  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
    return { mime: "application/pdf", ext: ".pdf" };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }
  if (
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: "image/png", ext: ".png" };
  }
  if (
    buf.subarray(0, 4).toString("latin1") === "RIFF" &&
    buf.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return { mime: "image/webp", ext: ".webp" };
  }
  return null;
}

/** Resolved lazily so .env is loaded by the time it is called. */
export const uploadDir = (subdir: string): string =>
  join(
    process.env.UPLOAD_ROOT || join(process.cwd(), "assets", "uploads"),
    subdir,
  );

/** YmdHis in IST (same convention as your file-upload.util.ts). */
export const istStamp = (): string =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);
