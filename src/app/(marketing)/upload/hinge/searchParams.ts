import { createSearchParamsCache, parseAsBoolean } from "nuqs/server";

export const hingeUploadSearchParams = {
  update: parseAsBoolean.withDefault(false),
  debug: parseAsBoolean.withDefault(false),
};

export const hingeUploadCache = createSearchParamsCache(
  hingeUploadSearchParams,
);
