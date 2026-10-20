import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Trim } from "./trim.transform";

// multipart / urlencoded bodies are all strings, so convert before validating
const blankToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

export const toNum = ({ value }: { value: unknown }) => {
  const v = blankToUndef(value);
  return v === undefined ? undefined : Number(v);
};

export const normEnum = ({ value }: { value: unknown }) =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "_")
    : value;

export const ID_REGEX = /^[A-Za-z0-9_-]{1,100}$/;

export const ReqId = () =>
  applyDecorators(
    ApiProperty(),
    Trim(),
    IsString(),
    Matches(ID_REGEX, {
      message: "must contain only letters, digits, - and _ (max 100)",
    }),
  );

export const ReqText = (max: number) =>
  applyDecorators(
    ApiProperty(),
    Trim(),
    IsString(),
    IsNotEmpty(),
    MaxLength(max),
  );

export const OptText = (max: number) =>
  applyDecorators(
    ApiPropertyOptional(),
    Trim(),
    IsOptional(),
    IsString(),
    MaxLength(max),
  );

export const OptNum = (min = 0, max = 99999999.99) =>
  applyDecorators(
    ApiPropertyOptional({ type: Number }),
    Transform(toNum),
    IsOptional(),
    IsNumber({ maxDecimalPlaces: 2 }),
    Min(min),
    Max(max),
  );

export const OptInt = (min = 1, max = 1_000_000) =>
  applyDecorators(
    ApiPropertyOptional({ type: Number }),
    Transform(toNum),
    IsOptional(),
    IsInt(),
    Min(min),
    Max(max),
  );

export { IsIn };
