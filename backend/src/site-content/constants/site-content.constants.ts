import { memoryStorage } from "multer";
import { BadRequestException } from "@nestjs/common";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";

export const SLIDER_UPLOAD_DIR = "./assets/uploads/slide";

const SLIDER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SLIDER_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Memory storage — we do the disk write explicitly in the service so we
// can distinguish "file rejected" (400) from "move/write failed" (per
// spec: 401) rather than letting Multer's own disk errors bubble up as
// an unhandled 500.
export const sliderMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_SLIDER_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!SLIDER_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new BadRequestException("File not received or invalid!"),
        false,
      );
    }
    cb(null, true);
  },
};

/** Generates `slider{YmdHis}.{ext}` in IST, matching the legacy naming pattern. */
export function generateSliderFilename(originalName: string): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${ist.getUTCFullYear()}${pad(ist.getUTCMonth() + 1)}${pad(ist.getUTCDate())}` +
    `${pad(ist.getUTCHours())}${pad(ist.getUTCMinutes())}${pad(ist.getUTCSeconds())}`;
  const ext = originalName.slice(originalName.lastIndexOf(".")) || "";
  return `slider${stamp}${ext}`;
}
