// =====================================================
// CONSENT STORAGE — web (localStorage)
// =====================================================
//
// Browser-specific read/write for the consent record. Pre-login this IS the
// source of truth; after real-user login it is mirrored into `user.analyticsConsent`
// (DB) so the server can read it too. Types live in `./consent`.

import {
  CONSENT_VERSION,
  normalizeConsent,
  type ConsentPreferences,
  type ConsentRecord,
} from "./consent";

const STORAGE_KEY = "swipestats_consent";

/** Read the stored decision, or null if none / unreadable. */
export function getStoredConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (!parsed?.preferences) return null;
    return {
      preferences: normalizeConsent(parsed.preferences),
      version: parsed.version ?? 0,
      decidedAt: parsed.decidedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Persist a decision (essential always forced true) and return the record. */
export function setStoredConsent(
  preferences: Partial<ConsentPreferences>,
): ConsentRecord {
  const record: ConsentRecord = {
    preferences: normalizeConsent(preferences),
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // localStorage unavailable — non-fatal
    }
  }
  return record;
}

/**
 * Persist a server-provided decision as the local device decision. Used only
 * when the browser has no fresh local record of its own.
 */
export function setStoredConsentRecord(record: ConsentRecord): ConsentRecord {
  const storedRecord: ConsentRecord = {
    preferences: normalizeConsent(record.preferences),
    version: record.version,
    decidedAt: record.decidedAt,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedRecord));
    } catch {
      // localStorage unavailable — non-fatal
    }
  }

  return storedRecord;
}

/** Remove the stored decision (reverts to "undecided" → banner shows again). */
export function clearStoredConsent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** A decision is stale if it predates the current consent version. */
export function isConsentStale(record: ConsentRecord | null): boolean {
  return !record || record.version < CONSENT_VERSION;
}

/** Browser Global Privacy Control signal — a legally recognized opt-out. */
export function isGpcEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}
