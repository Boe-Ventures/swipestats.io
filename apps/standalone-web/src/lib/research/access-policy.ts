export type DatasetLicenseEvidence = {
  valid: boolean;
  license_key?: {
    status: string;
    expires_at: string | null;
    test_mode: boolean;
  };
  meta?: { store_id: number; variant_id: number };
};
export function isResearchLicenseValid(
  data: DatasetLicenseEvidence,
  expected: {
    storeId: string;
    variantIds: readonly string[];
    production: boolean;
  },
  now = new Date(),
) {
  const key = data.license_key;
  const expiry = key?.expires_at ? new Date(key.expires_at).getTime() : null;
  return Boolean(
    data.valid &&
    key &&
    data.meta &&
    (key.status === "active" || key.status === "inactive") &&
    key.test_mode === !expected.production &&
    String(data.meta.store_id) === expected.storeId &&
    expected.variantIds.includes(String(data.meta.variant_id)) &&
    (expiry === null || (Number.isFinite(expiry) && expiry > now.getTime())),
  );
}

export function isExportExpired(expiresAt: Date | null, now = new Date()) {
  return (
    expiresAt !== null &&
    (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now)
  );
}
