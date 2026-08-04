import type { HingeMedia } from "@/lib/interfaces/HingeDataJSON";
import type { MediaInsert } from "@/server/db/schema";
import { createId } from "@/server/db/utils";

type PersistableHingeMedia = Omit<HingeMedia, "type"> & {
  type?: string;
};

/** Convert current-profile Hinge media into one durable row per source URL. */
export function transformHingeMediaToDb(
  media: readonly PersistableHingeMedia[],
  hingeProfileId: string,
): MediaInsert[] {
  const seenUrls = new Set<string>();

  return media.flatMap((item) => {
    // REVIEW(provider assumption): repeated exact URLs describe the same Hinge
    // media asset. Preserve the first provider-ordered occurrence so an export
    // cannot inflate photo counts while retaining its displayed ordering.
    if (seenUrls.has(item.url)) return [];
    seenUrls.add(item.url);

    return [
      {
        id: createId("media"),
        type: item.type || "photo",
        url: item.url,
        prompt: item.prompt || null,
        caption: null,
        fromSoMe: item.from_social_media ?? null,
        hingeProfileId,
        tinderProfileId: null,
      },
    ];
  });
}
