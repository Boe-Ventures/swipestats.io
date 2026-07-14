// =====================================================
// ANALYTICS PROPERTY REGISTRY — DERIVED FROM TYPES
// =====================================================
//
// `analytics.types.ts` remains the single source of truth for event property
// *shapes*. This file is supporting metadata for the /admin/tracking-plan
// catalog: a human-readable description of each property (display type,
// required flag, allowed values).
//
// HOW DRIFT IS PREVENTED
// ----------------------
// The `EventPropertyRegistry<Defs>` mapped type forces, for every event, a
// `PropertyMeta` entry for *every* property name — including names that only
// appear in one variant of a discriminated union. `AllPropKeys<T>` distributes
// across union members and strips index signatures, so:
//   - rename / add / remove / typo a property in analytics.types.ts
//     => this file fails the build until it matches.
//   - an event with no properties (`undefined` / `Record<string, never>`)
//     => resolves to `Record<never, _>` = `{}` (author an empty object).
//
// What is NOT compiler-checked: the `type` / `required` / `values` *values*
// themselves. Those are hand-authored display metadata — if one goes stale it
// is a cosmetic label in an admin table, never a runtime bug. Keep them honest.
// =====================================================

import {
  BILLING_PERIODS,
  BILLING_PROVIDERS,
  BILLING_SURFACES,
  DATASET_TIERS,
  PAID_TIERS,
} from "@/lib/validators";

import { ANONYMOUS_SOURCES } from "./analytics.types";
import type {
  ClientEventPropertiesDefinition,
  ServerEventPropertiesDefinition,
} from "./analytics.types";

export interface PropertyMeta {
  /** Display type, e.g. "string", "number", "boolean", "string[]", "enum". */
  type: string;
  /** Present in every variant of the event (not optional, not union-specific). */
  required: boolean;
  /** One-line description of the property. */
  description?: string;
  /** Allowed values for enum-like string literals. */
  values?: readonly string[];
}

// Strip index signatures (e.g. `[key: string]: unknown`), keep literal keys.
type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
}[keyof T];

// Distribute across union members, then union ALL of their literal keys.
type AllPropKeys<T> = T extends unknown ? KnownKeys<T> : never;

type EventPropertyRegistry<Defs> = {
  [K in keyof Defs]: Record<AllPropKeys<Defs[K]>, PropertyMeta>;
};

const DATASET_RECENCY = ["MIXED", "RECENT"] as const;
const PROVIDER = ["tinder", "hinge", "bumble"] as const;
const UPLOAD_PROVIDER = ["tinder", "hinge", "raya"] as const;
const AUTH_SOURCE = ["conversion_modal", "signin_page", "navbar"] as const;
const ROAST_TONE = ["helpful", "mild", "spicy"] as const;
const UPLOAD_ERROR_TYPE = ["auth", "ownership", "database", "unknown"] as const;

// =====================================================
// SERVER EVENT PROPERTIES
// =====================================================

export const SERVER_EVENT_PROPERTIES: EventPropertyRegistry<ServerEventPropertiesDefinition> =
  {
    // ── Auth ─────────────────────────────────────────
    user_signed_up: {
      method: {
        type: "enum",
        required: true,
        description: "How the account was created.",
        values: ["anonymous", "email", "oauth"],
      },
      email: {
        type: "string",
        required: false,
        description: "Present for the email method.",
      },
      provider: {
        type: "enum",
        required: false,
        description: "Present for the oauth method.",
        values: ["google"],
      },
    },
    user_account_created: {
      method: {
        type: "enum",
        required: true,
        description: "Credential type added to the account.",
        values: ["email", "oauth"],
      },
      provider: {
        type: "enum",
        required: false,
        description: "Present for the oauth method.",
        values: ["google"],
      },
    },
    user_signed_in: {
      method: {
        type: "enum",
        required: true,
        description: "Credential type used to sign in.",
        values: ["email", "username"],
      },
    },
    user_signed_out: {},

    // ── Anonymous (lead gen) ─────────────────────────
    anonymous_user_created: {
      source: {
        type: "enum",
        required: true,
        description: "Where the guest session was first created.",
        values: ANONYMOUS_SOURCES,
      },
    },
    anonymous_user_converted: {
      previousUserId: {
        type: "string",
        required: true,
        description: "The anonymous user id that was upgraded.",
      },
      hadProfile: {
        type: "boolean",
        required: true,
        description:
          "Whether the guest had uploaded a profile before converting.",
      },
      daysSinceCreation: {
        type: "number",
        required: true,
        description: "Age of the guest session at conversion.",
      },
    },

    // ── Tinder profiles ──────────────────────────────
    tinder_profile_created: {
      tinderId: { type: "string", required: true },
      matchCount: { type: "number", required: true },
      messageCount: { type: "number", required: true },
      photoCount: { type: "number", required: true },
      usageDays: { type: "number", required: true },
      hasPhotos: { type: "boolean", required: true },
      processingTimeMs: { type: "number", required: true },
      jsonSizeMB: { type: "number", required: true },
      consentPhotos: { type: "boolean", required: true },
      consentWork: { type: "boolean", required: true },
      blobUrl: {
        type: "string",
        required: false,
        description: "Anonymized raw upload, when stored.",
      },
    },
    tinder_profile_updated: {
      tinderId: { type: "string", required: true },
      matchCount: {
        type: "number",
        required: true,
        description: "Delta: new matches added by this upload (0 = none new).",
      },
      messageCount: {
        type: "number",
        required: true,
        description: "Delta: new messages added by this upload.",
      },
      photoCount: {
        type: "number",
        required: true,
        description:
          "Delta: new photos (always 0 — additive updates skip photos).",
      },
      usageDays: { type: "number", required: true },
      hasPhotos: { type: "boolean", required: true },
      processingTimeMs: { type: "number", required: true },
      jsonSizeMB: { type: "number", required: true },
      consentPhotos: { type: "boolean", required: true },
      consentWork: { type: "boolean", required: true },
    },
    tinder_profile_upload_failed: {
      tinderId: {
        type: "string",
        required: false,
        description: "May be absent if it failed before the id was known.",
      },
      errorType: {
        type: "enum",
        required: true,
        values: UPLOAD_ERROR_TYPE,
      },
      errorMessage: { type: "string", required: true },
      errorCode: { type: "string", required: false },
      errorConstraint: { type: "string", required: false },
      errorTable: { type: "string", required: false },
      errorColumn: { type: "string", required: false },
      errorDetail: { type: "string", required: false },
      blobUrl: {
        type: "string",
        required: false,
        description: "Uploaded blob URL if the upload made it to storage.",
      },
      jsonSizeMB: { type: "number", required: false },
    },

    // ── Hinge profiles ───────────────────────────────
    hinge_profile_created: {
      hingeId: { type: "string", required: true },
      matchCount: { type: "number", required: true },
      messageCount: { type: "number", required: true },
      photoCount: { type: "number", required: true },
      promptCount: { type: "number", required: true },
      interactionCount: { type: "number", required: true },
      hasPhotos: { type: "boolean", required: true },
      processingTimeMs: { type: "number", required: true },
      jsonSizeMB: { type: "number", required: true },
      consentPhotos: { type: "boolean", required: true },
      consentWork: { type: "boolean", required: true },
      blobUrl: {
        type: "string",
        required: false,
        description: "Anonymized raw upload, when stored.",
      },
    },
    hinge_profile_updated: {
      hingeId: { type: "string", required: true },
      matchCount: {
        type: "number",
        required: true,
        description: "Delta: new matches added by this upload (0 = none new).",
      },
      messageCount: {
        type: "number",
        required: true,
        description: "Delta: new messages added by this upload.",
      },
      photoCount: {
        type: "number",
        required: true,
        description: "Delta: new photos added by this upload.",
      },
      promptCount: { type: "number", required: true },
      interactionCount: {
        type: "number",
        required: true,
        description: "Delta: new interactions added by this upload.",
      },
      hasPhotos: { type: "boolean", required: true },
      processingTimeMs: { type: "number", required: true },
      jsonSizeMB: { type: "number", required: true },
      consentPhotos: { type: "boolean", required: true },
      consentWork: { type: "boolean", required: true },
    },
    hinge_profile_merged: {
      hingeId: { type: "string", required: true },
      oldHingeId: {
        type: "string",
        required: true,
        description: "The id that was merged away.",
      },
      matchCount: { type: "number", required: true },
      messageCount: { type: "number", required: true },
      photoCount: { type: "number", required: true },
      promptCount: { type: "number", required: true },
      interactionCount: { type: "number", required: true },
      hasPhotos: { type: "boolean", required: true },
      processingTimeMs: { type: "number", required: true },
      jsonSizeMB: { type: "number", required: true },
      consentPhotos: { type: "boolean", required: true },
      consentWork: { type: "boolean", required: true },
    },
    hinge_profile_upload_failed: {
      hingeId: {
        type: "string",
        required: false,
        description: "May be absent if it failed before the id was known.",
      },
      errorType: { type: "enum", required: true, values: UPLOAD_ERROR_TYPE },
      errorMessage: { type: "string", required: true },
      errorCode: { type: "string", required: false },
      errorConstraint: { type: "string", required: false },
      errorTable: { type: "string", required: false },
      errorColumn: { type: "string", required: false },
      errorDetail: { type: "string", required: false },
      blobUrl: {
        type: "string",
        required: false,
        description: "Uploaded blob URL if the upload made it to storage.",
      },
      jsonSizeMB: { type: "number", required: false },
    },

    // ── Comparison ───────────────────────────────────
    comparison_created: {
      comparisonId: { type: "string", required: true },
      columnCount: {
        type: "number",
        required: true,
        description: "Columns the comparison was seeded with.",
      },
      hasCustomPhotos: {
        type: "boolean",
        required: true,
        description: "Whether any column was seeded with uploaded photos.",
      },
    },
    comparison_shared: {
      comparisonId: { type: "string", required: true },
      shareKey: {
        type: "string",
        required: true,
        description: "Public share key generated when made public.",
      },
    },

    // ── Roast ────────────────────────────────────────
    roast_generated: {
      columnId: { type: "string", required: true },
      comparisonId: { type: "string", required: true },
      provider: {
        type: "string",
        required: true,
        description: "Dating provider of the roasted column.",
      },
      tone: { type: "enum", required: true, values: ROAST_TONE },
      photoCount: { type: "number", required: true },
      promptCount: { type: "number", required: true },
    },
    roast_published: {
      columnId: { type: "string", required: true },
      shareKey: {
        type: "string",
        required: true,
        description: "Public share key for /share/profile-roast.",
      },
    },
    stats_roast_generated: {
      provider: { type: "enum", required: true, values: ["tinder", "hinge"] },
      tone: { type: "enum", required: true, values: ROAST_TONE },
      regenerate: {
        type: "boolean",
        required: true,
        description: "True when forcing a fresh roast (e.g. tone change).",
      },
    },
    stats_roast_shared: {
      roastId: { type: "string", required: true },
      shareKey: {
        type: "string",
        required: true,
        description: "Public share key for /share/stats-roast.",
      },
    },

    // ── Monetization ─────────────────────────────────
    subscription_trial_started: {
      tier: { type: "enum", required: true, values: PAID_TIERS },
      trialDurationDays: { type: "number", required: true },
    },
    subscription_activated: {
      tier: { type: "enum", required: true, values: PAID_TIERS },
      source: {
        type: "enum",
        required: true,
        values: ["trial_conversion", "direct_purchase", "admin_grant"],
      },
      billingPeriod: {
        type: "enum",
        required: false,
        values: BILLING_PERIODS,
      },
      checkoutAttemptId: { type: "string", required: false },
    },
    subscription_cancelled: {
      tier: { type: "enum", required: true, values: PAID_TIERS },
      reason: {
        type: "enum",
        required: true,
        values: ["user_requested", "payment_failed", "admin_action"],
      },
      hadActiveSubscription: { type: "boolean", required: true },
    },

    // ── Billing ──────────────────────────────────────
    billing_checkout_created: {
      productLine: {
        type: "enum",
        required: true,
        values: ["subscription"],
      },
      billingProvider: {
        type: "enum",
        required: true,
        values: BILLING_PROVIDERS,
      },
      checkoutAttemptId: { type: "string", required: true },
      surface: {
        type: "enum",
        required: true,
        values: BILLING_SURFACES,
      },
      tier: { type: "enum", required: true, values: PAID_TIERS },
      billingPeriod: { type: "enum", required: true, values: BILLING_PERIODS },
      amount: { type: "number", required: true },
      currency: { type: "string", required: true },
      providerVariantId: { type: "string", required: true },
      testMode: { type: "boolean", required: true },
    },
    billing_payment_successful: {
      productLine: {
        type: "enum",
        required: true,
        values: ["subscription"],
      },
      billingProvider: {
        type: "enum",
        required: true,
        values: BILLING_PROVIDERS,
      },
      orderId: { type: "string | null", required: true },
      subscriptionId: {
        type: "string | null",
        required: true,
        description: "Null for one-off (lifetime) purchases.",
      },
      amount: { type: "number", required: true },
      currency: { type: "string", required: true },
      tier: { type: "enum", required: true, values: PAID_TIERS },
      billingPeriod: { type: "enum", required: true, values: BILLING_PERIODS },
      checkoutAttemptId: { type: "string", required: false },
      testMode: { type: "boolean", required: true },
    },
    billing_payment_failed: {
      subscriptionId: { type: "string | null", required: true },
      amount: { type: "number", required: true },
      currency: { type: "string", required: true },
      errorCode: { type: "string", required: false },
      errorMessage: { type: "string", required: false },
    },
    billing_subscription_updated: {
      subscriptionId: { type: "string", required: true },
      changeType: {
        type: "enum",
        required: true,
        values: [
          "plan_changed",
          "payment_method_updated",
          "billing_details_updated",
        ],
      },
      previousTier: { type: "enum", required: false, values: PAID_TIERS },
      newTier: { type: "enum", required: false, values: PAID_TIERS },
    },
    dataset_checkout_created: {
      productLine: {
        type: "enum",
        required: true,
        values: ["dataset"],
      },
      billingProvider: {
        type: "enum",
        required: true,
        values: BILLING_PROVIDERS,
      },
      checkoutAttemptId: { type: "string", required: true },
      surface: {
        type: "enum",
        required: true,
        values: BILLING_SURFACES,
      },
      tier: { type: "enum", required: true, values: DATASET_TIERS },
      amount: { type: "number", required: true },
      currency: { type: "string", required: true },
      providerVariantId: { type: "string", required: true },
      hasPrefilledEmail: { type: "boolean", required: true },
      testMode: { type: "boolean", required: true },
    },
    dataset_purchase_completed: {
      productLine: {
        type: "enum",
        required: true,
        values: ["dataset"],
      },
      billingProvider: {
        type: "enum",
        required: true,
        values: BILLING_PROVIDERS,
      },
      checkoutAttemptId: { type: "string", required: false },
      orderId: { type: "string | null", required: true },
      licenseKeyId: { type: "string", required: true },
      tier: { type: "enum", required: true, values: DATASET_TIERS },
      amount: { type: "number", required: true },
      currency: { type: "string", required: true },
      profileCount: { type: "number", required: true },
      recency: { type: "enum", required: true, values: DATASET_RECENCY },
      testMode: { type: "boolean", required: true },
    },
    dataset_export_queued: {
      exportId: { type: "string", required: true },
      checkoutAttemptId: { type: "string", required: false },
      orderId: { type: "string | null", required: true },
      licenseKeyId: { type: "string", required: false },
      tier: { type: "enum", required: true, values: DATASET_TIERS },
      profileCount: { type: "number", required: true },
      recency: { type: "enum", required: true, values: DATASET_RECENCY },
      source: {
        type: "enum",
        required: true,
        values: ["webhook", "download_page", "retry"],
      },
      alreadyExisted: { type: "boolean", required: true },
      testMode: { type: "boolean", required: false },
    },
    dataset_export_ready: {
      exportId: { type: "string", required: true },
      tier: { type: "enum", required: true, values: DATASET_TIERS },
      profileCount: { type: "number", required: true },
      recency: { type: "enum", required: true, values: DATASET_RECENCY },
      blobSize: { type: "number", required: true },
      compressedSize: { type: "number", required: true },
      generationTimeSeconds: { type: "number", required: true },
    },
    dataset_export_failed: {
      exportId: { type: "string", required: true },
      tier: { type: "enum", required: true, values: DATASET_TIERS },
      profileCount: { type: "number", required: true },
      recency: { type: "enum", required: true, values: DATASET_RECENCY },
      errorMessage: { type: "string", required: true },
    },
    dataset_downloaded: {
      exportId: { type: "string", required: true },
      orderId: { type: "string | null", required: true },
      tier: { type: "enum", required: true, values: DATASET_TIERS },
      profileCount: { type: "number", required: true },
      downloadCount: { type: "number", required: true },
      downloadsRemaining: { type: "number", required: true },
      maxDownloads: { type: "number", required: true },
    },

    // ── Life events ──────────────────────────────────
    life_event_created: {
      eventType: { type: "string", required: true },
      hasEndDate: { type: "boolean", required: true },
      hasLocation: { type: "boolean", required: true },
    },
    life_event_updated: {
      eventType: { type: "string", required: true },
      previousEventType: {
        type: "string",
        required: false,
        description: "Present when the event type changed.",
      },
      changedEndDate: { type: "boolean", required: true },
      changedLocation: { type: "boolean", required: true },
    },
    life_event_deleted: {
      eventType: { type: "string", required: true },
      hadEndDate: { type: "boolean", required: true },
      hadLocation: { type: "boolean", required: true },
    },

    // ── Admin / debug ────────────────────────────────
    admin_test_event_fired: {
      surface: { type: "enum", required: true, values: ["server", "client"] },
      nonce: {
        type: "string",
        required: true,
        description: "Unique id to locate the event in PostHog/Amplitude.",
      },
      source: { type: "string", required: true },
    },
  };

// =====================================================
// CLIENT EVENT PROPERTIES
// =====================================================

export const CLIENT_EVENT_PROPERTIES: EventPropertyRegistry<ClientEventPropertiesDefinition> =
  {
    // ── Navigation ───────────────────────────────────
    page_viewed: {
      path: { type: "string", required: true },
      referrer: { type: "string", required: false },
    },
    blog_product_card_clicked: {
      sourcePost: {
        type: "string",
        required: true,
        description: "Blog slug where the contextual product card was clicked.",
      },
      destinationProduct: {
        type: "enum",
        required: true,
        values: [
          "insights",
          "profile-compare",
          "profile-roast",
          "prompt-assistant",
          "directory",
        ],
        description: "Product surface promoted by the card.",
      },
      destinationPath: {
        type: "string",
        required: true,
        description: "Internal path opened by the card CTA.",
      },
    },
    sponsor_impression: {
      campaignId: { type: "string", required: true },
      placement: {
        type: "enum",
        required: true,
        values: ["sitewide-bar", "blog-inline"],
      },
      sourcePath: { type: "string", required: true },
      sponsorName: { type: "string", required: true },
    },
    sponsor_clicked: {
      campaignId: { type: "string", required: true },
      placement: {
        type: "enum",
        required: true,
        values: ["sitewide-bar", "blog-inline"],
      },
      sourcePath: { type: "string", required: true },
      sponsorName: { type: "string", required: true },
    },
    sponsor_inquiry_clicked: {
      campaignId: { type: "string", required: true },
      placement: {
        type: "enum",
        required: true,
        values: ["sitewide-bar", "blog-inline"],
      },
      sourcePath: { type: "string", required: true },
      sponsorName: { type: "string", required: true },
    },

    // ── Auth UI ──────────────────────────────────────
    sign_up_clicked: {
      method: { type: "enum", required: true, values: ["email", "oauth"] },
      source: { type: "enum", required: true, values: AUTH_SOURCE },
      provider: {
        type: "enum",
        required: false,
        values: ["google"],
        description: "Present for the oauth method.",
      },
    },
    sign_in_clicked: {
      method: {
        type: "enum",
        required: true,
        values: ["username", "email", "oauth"],
      },
      source: { type: "enum", required: true, values: AUTH_SOURCE },
      provider: {
        type: "enum",
        required: false,
        values: ["google"],
        description: "Present for the oauth method.",
      },
    },
    sign_out_clicked: {},

    // ── Conversion funnel ────────────────────────────
    conversion_dialog_opened: {
      reason: {
        type: "enum",
        required: true,
        values: ["upload_limit", "feature_gate", "share_prompt", "manual"],
      },
      hasProfile: { type: "boolean", required: true },
    },
    conversion_dialog_dismissed: {
      reason: {
        type: "enum",
        required: true,
        values: ["upload_limit", "feature_gate", "share_prompt", "manual"],
      },
      timeSpentSeconds: { type: "number", required: true },
    },
    conversion_dialog_tab_changed: {
      from: { type: "enum", required: true, values: ["create", "signin"] },
      to: { type: "enum", required: true, values: ["create", "signin"] },
    },

    // ── Upload flow ──────────────────────────────────
    upload_started: {
      source: {
        type: "enum",
        required: true,
        values: ["dashboard", "landing_page", "navbar"],
      },
    },
    upload_file_selected: {
      provider: { type: "enum", required: true, values: PROVIDER },
      fileSize: { type: "number", required: true },
      isReupload: { type: "boolean", required: true },
    },
    upload_provider_selected: {
      provider: { type: "enum", required: true, values: PROVIDER },
      source: {
        type: "enum",
        required: true,
        values: ["upload_modal", "instructions_page"],
      },
    },
    upload_file_processing_started: {
      provider: { type: "enum", required: true, values: UPLOAD_PROVIDER },
      fileSize: { type: "number", required: true },
      fileType: {
        type: "string",
        required: true,
        description: '".zip" or ".json"',
      },
    },
    upload_file_read_failed: {
      provider: { type: "enum", required: true, values: UPLOAD_PROVIDER },
      fileSize: { type: "number", required: true },
      fileType: { type: "string", required: true },
      errorType: {
        type: "enum",
        required: true,
        values: ["file_read", "zip_extraction", "json_parse"],
      },
      errorMessage: { type: "string", required: true },
      filesInZip: {
        type: "number",
        required: false,
        description: "Only for zip_extraction errors.",
      },
    },
    upload_validation_failed: {
      provider: { type: "enum", required: true, values: UPLOAD_PROVIDER },
      missingFields: { type: "string[]", required: true },
      errorMessage: { type: "string", required: true },
    },
    upload_preview_loaded: {
      provider: { type: "enum", required: true, values: UPLOAD_PROVIDER },
      tinderId: { type: "string", required: false },
      hingeId: { type: "string", required: false },
      fileSizeMB: { type: "number", required: true },
      matchCount: { type: "number", required: true },
      messageCount: { type: "number", required: true },
      photoCount: {
        type: "number",
        required: true,
        description: "Always present, 0 if no consent.",
      },
      hasPhotos: {
        type: "boolean",
        required: true,
        description: "Actual data presence.",
      },
      hasPhotosConsent: {
        type: "boolean",
        required: true,
        description: "User consent state.",
      },
      usageDays: {
        type: "number",
        required: false,
        description: "Tinder only.",
      },
      hasWork: {
        type: "boolean",
        required: false,
        description: "Tinder only.",
      },
      hasWorkConsent: {
        type: "boolean",
        required: false,
        description: "Tinder only.",
      },
      promptCount: {
        type: "number",
        required: false,
        description: "Hinge only.",
      },
      hasUnknownGender: {
        type: "boolean",
        required: false,
        description: "Tinder only.",
      },
    },
    upload_consent_photos_toggled: {
      provider: { type: "enum", required: true, values: UPLOAD_PROVIDER },
      tinderId: { type: "string", required: false },
      hingeId: { type: "string", required: false },
      consentGiven: { type: "boolean", required: true },
    },
    upload_consent_work_toggled: {
      provider: { type: "enum", required: true, values: UPLOAD_PROVIDER },
      tinderId: { type: "string", required: false },
      hingeId: { type: "string", required: false },
      consentGiven: { type: "boolean", required: true },
    },
    upload_gender_corrected: {
      tinderId: {
        type: "string",
        required: false,
        description: "Tinder only.",
      },
      hadUnknownGender: { type: "boolean", required: true },
      hadUnknownInterestedIn: { type: "boolean", required: true },
      hadUnknownGenderFilter: { type: "boolean", required: true },
    },
    upload_submit_clicked: {
      provider: { type: "enum", required: true, values: UPLOAD_PROVIDER },
      tinderId: { type: "string", required: false },
      hingeId: { type: "string", required: false },
      rayaId: { type: "string", required: false },
      photoCount: { type: "number", required: true },
      hasPhotos: { type: "boolean", required: true },
      hasPhotosConsent: { type: "boolean", required: true },
      hasWork: {
        type: "boolean",
        required: false,
        description: "Tinder only.",
      },
      hasWorkConsent: {
        type: "boolean",
        required: false,
        description: "Tinder only.",
      },
      matchCount: { type: "number", required: true },
      scenario: {
        type: "string",
        required: false,
        description: "Upload scenario context.",
      },
    },

    // ── Insights ─────────────────────────────────────
    insights_tab_changed: {
      from: { type: "string", required: true },
      to: { type: "string", required: true },
    },

    // ── Monetization funnel ──────────────────────────
    upgrade_modal_opened: {
      source: {
        type: "enum",
        required: true,
        values: ["feature_gate", "pricing_page", "settings", "banner"],
      },
      currentTier: {
        type: "enum",
        required: true,
        values: ["FREE", "PLUS", "ELITE"],
      },
      blockedFeature: { type: "string", required: false },
    },
    upgrade_modal_dismissed: {
      source: {
        type: "enum",
        required: true,
        values: ["feature_gate", "pricing_page", "settings", "banner"],
      },
      timeSpentSeconds: { type: "number", required: true },
      viewedPlans: { type: "enum[]", required: true, values: PAID_TIERS },
    },
    upgrade_plan_selected: {
      tier: { type: "enum", required: true, values: PAID_TIERS },
      billingPeriod: { type: "enum", required: true, values: BILLING_PERIODS },
      price: { type: "number", required: true },
    },
    upgrade_checkout_clicked: {
      tier: { type: "enum", required: true, values: PAID_TIERS },
      billingPeriod: { type: "enum", required: true, values: BILLING_PERIODS },
      price: { type: "number", required: true },
      source: {
        type: "enum",
        required: false,
        values: ["feature_gate", "pricing_page", "settings", "banner"],
      },
    },
    dataset_checkout_clicked: {
      tier: { type: "enum", required: true, values: DATASET_TIERS },
      price: { type: "number", required: true },
      source: {
        type: "enum",
        required: true,
        values: ["research_pricing", "dataset_pricing", "home"],
      },
    },
    dataset_academic_inquiry_clicked: {
      source: {
        type: "enum",
        required: true,
        values: ["research_pricing", "dataset_pricing"],
      },
      price: { type: "string", required: true },
    },

    // ── Cookie consent ───────────────────────────────
    cookie_consent_accepted: {},
    cookie_consent_declined: {},

    // ── Life events ──────────────────────────────────
    life_event_dialog_opened: {
      source: {
        type: "enum",
        required: true,
        values: ["dashboard", "insights_page"],
      },
      trigger: {
        type: "enum",
        required: true,
        values: ["card_click", "button_click"],
      },
      hasExistingEvents: { type: "boolean", required: true },
      eventCount: { type: "number", required: true },
    },

    // ── Roast & comparison share ─────────────────────
    roast_dialog_opened: {
      columnId: { type: "string", required: true },
      provider: { type: "string", required: true },
      photoCount: { type: "number", required: true },
      promptCount: { type: "number", required: true },
    },
    roast_tone_selected: {
      columnId: { type: "string", required: true },
      tone: { type: "enum", required: true, values: ROAST_TONE },
      regenerate: {
        type: "boolean",
        required: true,
        description: "True when re-roasting with a different tone.",
      },
    },
    roast_shared_viewed: {
      shareKey: { type: "string", required: true },
      tone: { type: "enum", required: true, values: ROAST_TONE },
      viewerIsOwner: { type: "boolean", required: true },
    },
    comparison_shared_viewed: {
      shareKey: { type: "string", required: true },
      columnCount: { type: "number", required: true },
    },

    // ── Admin / debug ────────────────────────────────
    admin_test_event_fired: {
      surface: { type: "enum", required: true, values: ["server", "client"] },
      nonce: { type: "string", required: true },
      source: { type: "string", required: true },
    },
  };

// =====================================================
// IDENTIFY — USER TRAITS
// =====================================================
//
// Traits attached to the user profile (not events) via PostHog `identifyUser`
// (server) and Amplitude `identify` (client).
//
// NOT compiler-pinned to `UserTraits`: that interface carries a
// `[key: string]: unknown` index signature, and TypeScript's `keyof` collapses
// named keys into `string` when an index signature is present — so the named
// keys can't be recovered at the type level. This list mirrors the named
// fields of `UserTraits` by hand; keep it in sync if those change.

export const USER_TRAITS: Record<string, PropertyMeta> = {
  email: { type: "string", required: false },
  name: { type: "string", required: false },
  username: { type: "string", required: false },
  isAnonymous: { type: "boolean", required: false },
  swipestatsTier: {
    type: "string",
    required: false,
    description: "FREE / PLUS / ELITE.",
  },
  city: { type: "string", required: false },
  country: { type: "string", required: false },
};
