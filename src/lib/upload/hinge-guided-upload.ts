export const HINGE_REQUIRED_EXPORT_FILES = [
  { key: "user", fileName: "user.json" },
  { key: "matches", fileName: "matches.json" },
] as const;

export const HINGE_OPTIONAL_EXPORT_FILES = [
  { key: "prompts", fileName: "prompts.json" },
  { key: "media", fileName: "media.json" },
] as const;

export type HingeExportFileKey =
  | (typeof HINGE_REQUIRED_EXPORT_FILES)[number]["key"]
  | (typeof HINGE_OPTIONAL_EXPORT_FILES)[number]["key"];

export type HingeFileStatus = "missing" | "loaded" | "error";

export type HingeExportFileContents = Partial<
  Record<HingeExportFileKey, string>
>;

export type HingeChecklistState = Record<HingeExportFileKey, HingeFileStatus>;

const FILE_KEY_BY_NAME = new Map<string, HingeExportFileKey>([
  ...HINGE_REQUIRED_EXPORT_FILES.map(
    ({ key, fileName }) => [fileName, key] as const,
  ),
  ...HINGE_OPTIONAL_EXPORT_FILES.map(
    ({ key, fileName }) => [fileName, key] as const,
  ),
]);

export const EMPTY_HINGE_CHECKLIST_STATE: HingeChecklistState = {
  user: "missing",
  matches: "missing",
  prompts: "missing",
  media: "missing",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getHingeExportFileKey(
  pathOrFileName: string,
): HingeExportFileKey | undefined {
  const baseName = pathOrFileName.split(/[\\/]/).pop()?.toLowerCase();
  return baseName ? FILE_KEY_BY_NAME.get(baseName) : undefined;
}

/**
 * Claim a recognized file once within one browser drop operation. Separate
 * later drops may intentionally replace a file, but two same-name candidates
 * in one ZIP/drop are ambiguous and must not be combined silently.
 */
export function claimHingeExportFileCandidate(
  pathOrFileName: string,
  claimedKeys: Set<HingeExportFileKey>,
): { key: HingeExportFileKey; duplicate: boolean } | undefined {
  const key = getHingeExportFileKey(pathOrFileName);
  if (!key) return undefined;

  const duplicate = claimedKeys.has(key);
  claimedKeys.add(key);
  return { key, duplicate };
}

function hasExpectedTopLevelShape(
  key: HingeExportFileKey,
  parsed: unknown,
): boolean {
  if (key === "user") {
    return (
      isRecord(parsed) && isRecord(parsed.account) && isRecord(parsed.profile)
    );
  }

  return Array.isArray(parsed);
}

export type HingeExportFileValidation =
  | { ok: true; key: HingeExportFileKey }
  | { ok: false; key: HingeExportFileKey; message: string };

/**
 * Validate one recognized export file without retaining its parsed contents.
 * Error messages are deliberately generic so browser parse details or export
 * values never get reflected into the page or analytics.
 */
export function validateHingeExportFile(
  key: HingeExportFileKey,
  content: string,
): HingeExportFileValidation {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    return {
      ok: false,
      key,
      message: `${fileNameForKey(key)} is not valid JSON. Replace it with the original file from your Hinge download.`,
    };
  }

  if (!hasExpectedTopLevelShape(key, parsed)) {
    return {
      ok: false,
      key,
      message: `${fileNameForKey(key)} does not look like the expected Hinge export file.`,
    };
  }

  return { ok: true, key };
}

export function fileNameForKey(key: HingeExportFileKey): string {
  return `${key}.json`;
}

export function hasRequiredHingeExportFiles(
  state: HingeChecklistState,
): boolean {
  return HINGE_REQUIRED_EXPORT_FILES.every(
    ({ key }) => state[key] === "loaded",
  );
}

export function buildHingeExtractionInput(files: HingeExportFileContents): {
  jsonStrings: string[];
  filePresence: { prompts: boolean };
} {
  const jsonStrings = [
    files.user,
    files.matches,
    files.prompts,
    files.media,
  ].filter((content): content is string => content !== undefined);

  return {
    jsonStrings,
    filePresence: { prompts: files.prompts !== undefined },
  };
}

export function hingeExtractionErrorMessage(): string {
  return "We couldn't validate these files as one Hinge export. Check that user.json and matches.json came from the same download, then try again.";
}
