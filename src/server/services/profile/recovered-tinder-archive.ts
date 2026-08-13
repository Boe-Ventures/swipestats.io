/**
 * A recovery archive is deliberately not a Tinder export. It captures the
 * current normalized projection when the original anonymized transport object
 * has already been deleted, and names every deleted upload receipt it covers.
 */
export type LostTinderUploadReceipt = {
  id: string;
  committedAt: Date | null;
  cleanedAt: Date | null;
  originalBlobUrl: string | null;
};

export function recoveredTinderArchivePath(tinderId: string): string {
  return `recovered-tinder-archives/${tinderId}/derived-state.json`;
}

export function buildRecoveredTinderArchive(input: {
  tinderId: string;
  recoveredAt: Date;
  receipts: LostTinderUploadReceipt[];
  profile: unknown;
  usage: unknown[];
  matches: unknown[];
  messages: unknown[];
  media: unknown[];
  jobs: unknown[];
  schools: unknown[];
}): Record<string, unknown> {
  return {
    format: "swipestats.tinder-derived-state-recovery.v1",
    recovery: {
      recoveredAt: input.recoveredAt.toISOString(),
      limitation:
        "The original anonymized Tinder export was deleted by the transient upload pipeline. This is a reconstruction from the current normalized SwipeStats state, not the original provider file.",
      replacesDeletedTransientUploads: input.receipts.map((receipt) => ({
        id: receipt.id,
        committedAt: receipt.committedAt?.toISOString() ?? null,
        cleanedAt: receipt.cleanedAt?.toISOString() ?? null,
        originalBlobUrl: receipt.originalBlobUrl,
      })),
    },
    tinderId: input.tinderId,
    derivedState: {
      profile: input.profile,
      usage: input.usage,
      matches: input.matches,
      messages: input.messages,
      media: input.media,
      jobs: input.jobs,
      schools: input.schools,
    },
  };
}
