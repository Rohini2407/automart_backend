// listings.constants.ts
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import {
  multerOptionsFor,
  DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from "../common/utils/file-upload.util";
import { memoryStorage } from "multer";
import { BadRequestException } from "@nestjs/common";

export const PREOWNED_FILE_FIELDS = [
  { name: "image0", maxCount: 1 },
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
  { name: "aadhar_front", maxCount: 1 },
  { name: "rc_details", maxCount: 1 },
];

const PREOWNED_FIELD_PREFIXES: Record<string, string> = {
  image0: "img0",
  image1: "img1",
  image2: "img2",
  image3: "img3",
  image4: "img4",
  aadhar_front: "aadhar",
  rc_details: "rc",
};

export const preownedMulterOptions = multerOptionsFor(
  "preowned",
  DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  (fieldname) => PREOWNED_FIELD_PREFIXES[fieldname] ?? fieldname,
);

export type PreownedFiles = Record<string, Express.Multer.File[]>;

export const PREOWNED_REQUIRED_FIELDS = ["aadhar_front", "rc_details"];
export const PREOWNED_IMAGE_FIELDS = [
  "image0",
  "image1",
  "image2",
  "image3",
  "image4",
];

export const GARAGE_UPLOAD_DIR = "./assets/uploads/garages";
const GARAGE_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_GARAGE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const garageMulterOptions: MulterOptions = {
  storage: memoryStorage(), // buffer, not disk — service does the write so it can return 401 on failure
  limits: { fileSize: MAX_GARAGE_PHOTO_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!GARAGE_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new BadRequestException("File not received or invalid!"),
        false,
      );
    }
    cb(null, true);
  },
};

export const TECHNICIAN_FILE_FIELDS = [
  { name: "profilePhoto", maxCount: 1 },
  { name: "aadharCardImage", maxCount: 1 },
];

export const TECHNICIAN_UPLOAD_DIR = "./assets/uploads/technician";
const TECHNICIAN_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_TECHNICIAN_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const technicianMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_TECHNICIAN_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!TECHNICIAN_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new BadRequestException(`Invalid file type for "${file.fieldname}"`),
        false,
      );
    }
    cb(null, true);
  },
};

export type TechnicianFiles = Record<
  "profilePhoto" | "aadharCardImage",
  Express.Multer.File[]
>;