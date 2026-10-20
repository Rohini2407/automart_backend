import { Transform } from "class-transformer";

/** Trims strings; turns empty strings into undefined so optional fields stay NULL in DB. */
export const Trim = () =>
  Transform(({ value }) => {
    if (typeof value !== "string") return value;
    const v = value.trim();
    return v === "" ? undefined : v;
  });
