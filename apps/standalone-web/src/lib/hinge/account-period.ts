export type HingeAccountPeriod = {
  createDate: Date;
  firstAccountCreateDate: Date | null;
};

function assertValidDate(value: Date, label: string): void {
  if (!Number.isFinite(value.getTime())) {
    throw new Error(`${label} must be a valid date`);
  }
}

/**
 * Detect the same provider account across SwipeStats Hinge-ID revisions.
 *
 * REVIEW(provider assumption): Hinge exports do not include a durable account
 * ID. We therefore treat an exactly equal account signup instant, within the
 * same signed-in SwipeStats user, as the same Hinge account. This is deliberately
 * exact: nearby signup times could represent distinct recreated accounts.
 */
export function isSameHingeAccountSignup(
  existingCreateDate: Date,
  incomingCreateDate: Date,
): boolean {
  assertValidDate(existingCreateDate, "Existing Hinge signup");
  assertValidDate(incomingCreateDate, "Incoming Hinge signup");
  return existingCreateDate.getTime() === incomingCreateDate.getTime();
}

export function getEarliestHingeAccountSignup(
  existing: HingeAccountPeriod,
  incomingCreateDate: Date,
): Date {
  assertValidDate(existing.createDate, "Existing Hinge signup");
  assertValidDate(incomingCreateDate, "Incoming Hinge signup");
  const existingFirst = existing.firstAccountCreateDate ?? existing.createDate;
  assertValidDate(existingFirst, "First Hinge account signup");
  return existingFirst < incomingCreateDate
    ? existingFirst
    : incomingCreateDate;
}

/** Keep current-account and earliest-history signup semantics independent. */
export function getForwardHingeAccountMergePeriod(
  existing: HingeAccountPeriod,
  incomingCreateDate: Date,
): HingeAccountPeriod {
  if (incomingCreateDate < existing.createDate) {
    throw new Error(
      "Cross-account Hinge merges must move from an older account to a newer account",
    );
  }

  return {
    createDate: incomingCreateDate,
    firstAccountCreateDate: getEarliestHingeAccountSignup(
      existing,
      incomingCreateDate,
    ),
  };
}
