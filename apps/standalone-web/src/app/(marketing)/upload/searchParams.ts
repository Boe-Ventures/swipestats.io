import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const uploadSearchParams = {
  provider: parseAsString.withDefault(""),
};

export const uploadCache = createSearchParamsCache(uploadSearchParams);
