// =====================================================
// ANALYTICS TRACKING PLAN — RUNTIME REGISTRY
// =====================================================
//
// This is the runtime companion to `analytics.types.ts`.
//
// `analytics.types.ts` owns the *property shapes* (rich, type-only,
// discriminated unions — erased at runtime). This file owns the
// *catalog metadata* (category, description, status, destinations) that
// powers the /admin/tracking-plan page and documents where each event is
// routed.
//
// The two `satisfies Record<...EventName, EventMeta>` assertions pin this
// registry to the event-name unions: add an event to the union without a
// metadata entry here (or vice-versa) and the build fails. Event names
// therefore cannot drift between the type layer and the catalog.
//
// NOTE on `status`: this is a *manual declaration* of whether the event is
// wired up in code today. It is not yet auto-derived from live PostHog
// volume — that cross-reference is a deliberate future step. Keep it honest
// when adding/removing emit sites.
// =====================================================

import type {
  ClientAnalyticsEventName,
  ServerAnalyticsEventName,
} from "./analytics.types";

export type AnalyticsDestination = "posthog" | "vercel" | "slack" | "amplitude";

export type EventStatus =
  | "live" // Has at least one emit site in code
  | "planned" // Defined in the taxonomy but not yet fired anywhere
  | "deprecated"; // Kept for historical data, no longer fired

export interface EventMeta {
  category: string;
  description: string;
  status: EventStatus;
  destinations: AnalyticsDestination[];
}

// Every server event flows through the multi-provider fan-out in
// analytics.service.ts (PostHog + Vercel). A subset is additionally
// forwarded to Slack for operator visibility.
const PH_VERCEL: AnalyticsDestination[] = ["posthog", "vercel"];
const PH_VERCEL_SLACK: AnalyticsDestination[] = ["posthog", "vercel", "slack"];

export const SERVER_EVENT_REGISTRY = {
  // ── Auth ─────────────────────────────────────────
  user_signed_up: {
    category: "Auth",
    description: "First account creation (anonymous, email, or OAuth).",
    status: "live",
    destinations: PH_VERCEL,
  },
  user_account_created: {
    category: "Auth",
    description: "Email/password or OAuth credentials added to an account.",
    status: "live",
    destinations: PH_VERCEL,
  },
  user_signed_in: {
    category: "Auth",
    description: "Returning user authenticated successfully.",
    status: "live",
    destinations: PH_VERCEL,
  },
  user_signed_out: {
    category: "Auth",
    description: "User session ended. Currently emitted client-side only.",
    status: "planned",
    destinations: PH_VERCEL,
  },

  // ── Anonymous (lead gen) ─────────────────────────
  anonymous_user_created: {
    category: "Anonymous",
    description: "Guest session started. Carries the entry-point source.",
    status: "live",
    destinations: PH_VERCEL,
  },
  anonymous_user_converted: {
    category: "Anonymous",
    description: "Guest upgraded to a real account; events are aliased.",
    status: "live",
    destinations: PH_VERCEL,
  },

  // ── Tinder profiles (core product) ───────────────
  tinder_profile_created: {
    category: "Tinder Profile",
    description: "New Tinder profile uploaded and processed successfully.",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },
  tinder_profile_updated: {
    category: "Tinder Profile",
    description: "Existing Tinder profile re-uploaded / refreshed.",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },
  tinder_profile_upload_failed: {
    category: "Tinder Profile",
    description: "Tinder upload failed (auth/ownership/database/unknown).",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },

  // ── Hinge profiles ───────────────────────────────
  hinge_profile_created: {
    category: "Hinge Profile",
    description: "New Hinge profile uploaded and processed successfully.",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },
  hinge_profile_updated: {
    category: "Hinge Profile",
    description: "Existing Hinge profile re-uploaded / refreshed.",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },
  hinge_profile_merged: {
    category: "Hinge Profile",
    description: "Two Hinge profiles merged across accounts.",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },
  hinge_profile_upload_failed: {
    category: "Hinge Profile",
    description: "Hinge upload failed (auth/ownership/database/unknown).",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },

  // ── Comparison (unique feature) ──────────────────
  comparison_created: {
    category: "Comparison",
    description: "Profile comparison created. Not yet instrumented.",
    status: "planned",
    destinations: PH_VERCEL_SLACK,
  },
  comparison_shared: {
    category: "Comparison",
    description: "Comparison made public via share key. Not yet instrumented.",
    status: "planned",
    destinations: PH_VERCEL,
  },

  // ── Monetization (outcomes) ──────────────────────
  subscription_trial_started: {
    category: "Monetization",
    description: "User started a free trial. Not yet implemented.",
    status: "planned",
    destinations: PH_VERCEL,
  },
  subscription_activated: {
    category: "Monetization",
    description: "User gained premium access (trial/direct/admin grant).",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },
  subscription_cancelled: {
    category: "Monetization",
    description: "User lost premium access.",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },

  // ── Billing (implementation detail) ──────────────
  billing_checkout_created: {
    category: "Billing",
    description: "Checkout session initiated. Not yet instrumented.",
    status: "planned",
    destinations: PH_VERCEL,
  },
  billing_payment_successful: {
    category: "Billing",
    description: "Payment processed successfully (webhook).",
    status: "live",
    destinations: PH_VERCEL_SLACK,
  },
  billing_payment_failed: {
    category: "Billing",
    description: "Payment failed. Handler ready; not yet confirmed firing.",
    status: "planned",
    destinations: PH_VERCEL_SLACK,
  },
  billing_subscription_updated: {
    category: "Billing",
    description: "Subscription modified (plan/payment/billing details).",
    status: "planned",
    destinations: PH_VERCEL,
  },

  // ── Life events (engagement) ─────────────────────
  life_event_created: {
    category: "Life Events",
    description: "User created a life event on their timeline.",
    status: "live",
    destinations: PH_VERCEL,
  },
  life_event_updated: {
    category: "Life Events",
    description: "User updated an existing life event.",
    status: "live",
    destinations: PH_VERCEL,
  },
  life_event_deleted: {
    category: "Life Events",
    description: "User deleted a life event.",
    status: "live",
    destinations: PH_VERCEL,
  },

  // ── Admin / debug ────────────────────────────────
  admin_test_event_fired: {
    category: "Admin / Debug",
    description: "Internal test event fired from the admin analytics harness.",
    status: "live",
    destinations: PH_VERCEL,
  },
} satisfies Record<ServerAnalyticsEventName, EventMeta>;

// Client events flow through the consent-gated provider array in
// AnalyticsProvider.tsx (PostHog + Vercel + Amplitude).
const CLIENT_DEST: AnalyticsDestination[] = ["posthog", "vercel", "amplitude"];

export const CLIENT_EVENT_REGISTRY = {
  // ── Navigation ───────────────────────────────────
  page_viewed: {
    category: "Navigation",
    description: "Route navigation. PostHog handles pageviews natively today.",
    status: "planned",
    destinations: CLIENT_DEST,
  },

  // ── Auth UI ──────────────────────────────────────
  sign_up_clicked: {
    category: "Auth UI",
    description: "User clicked a sign-up affordance.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  sign_in_clicked: {
    category: "Auth UI",
    description: "User clicked a sign-in affordance.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  sign_out_clicked: {
    category: "Auth UI",
    description: "User clicked sign out (user dropdown).",
    status: "live",
    destinations: CLIENT_DEST,
  },

  // ── Conversion funnel ────────────────────────────
  conversion_dialog_opened: {
    category: "Conversion Funnel",
    description: "Anonymous→real conversion dialog shown.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  conversion_dialog_dismissed: {
    category: "Conversion Funnel",
    description: "Conversion dialog dismissed without converting.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  conversion_dialog_tab_changed: {
    category: "Conversion Funnel",
    description: "Switched between create/sign-in tabs in the dialog.",
    status: "planned",
    destinations: CLIENT_DEST,
  },

  // ── Upload flow ──────────────────────────────────
  upload_started: {
    category: "Upload Flow",
    description: "Upload flow entered. Not yet instrumented.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  upload_file_selected: {
    category: "Upload Flow",
    description: "File chosen. Not yet instrumented.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  upload_provider_selected: {
    category: "Upload Flow",
    description: "Dating provider chosen. Not yet instrumented.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  upload_file_processing_started: {
    category: "Upload Flow",
    description: "File processing began (drag or click).",
    status: "live",
    destinations: CLIENT_DEST,
  },
  upload_file_read_failed: {
    category: "Upload Flow",
    description: "File unreadable (read / zip extraction / JSON parse).",
    status: "live",
    destinations: CLIENT_DEST,
  },
  upload_validation_failed: {
    category: "Upload Flow",
    description: "Upload missing required fields.",
    status: "live",
    destinations: CLIENT_DEST,
  },
  upload_preview_loaded: {
    category: "Upload Flow",
    description: "Preview reached — key success milestone.",
    status: "live",
    destinations: CLIENT_DEST,
  },
  upload_consent_photos_toggled: {
    category: "Upload Flow",
    description: "User changed photo-sharing consent during upload.",
    status: "live",
    destinations: CLIENT_DEST,
  },
  upload_consent_work_toggled: {
    category: "Upload Flow",
    description: "User changed work-data consent during upload.",
    status: "live",
    destinations: CLIENT_DEST,
  },
  upload_gender_corrected: {
    category: "Upload Flow",
    description: "User manually corrected gender fields (Tinder).",
    status: "live",
    destinations: CLIENT_DEST,
  },
  upload_submit_clicked: {
    category: "Upload Flow",
    description: "User clicked submit on the upload preview.",
    status: "live",
    destinations: CLIENT_DEST,
  },

  // ── Insights ─────────────────────────────────────
  insights_tab_changed: {
    category: "Insights",
    description: "Switched tabs in the insights view. Not yet instrumented.",
    status: "planned",
    destinations: CLIENT_DEST,
  },

  // ── Monetization funnel ──────────────────────────
  upgrade_modal_opened: {
    category: "Monetization Funnel",
    description: "Upgrade modal opened. Not yet instrumented.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  upgrade_modal_dismissed: {
    category: "Monetization Funnel",
    description: "Upgrade modal dismissed. Not yet instrumented.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  upgrade_plan_selected: {
    category: "Monetization Funnel",
    description: "A plan was selected in the upgrade flow. Not yet instrumented.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  upgrade_checkout_clicked: {
    category: "Monetization Funnel",
    description: "Checkout triggered from the upgrade flow. Not yet instrumented.",
    status: "planned",
    destinations: CLIENT_DEST,
  },

  // ── Cookie consent ───────────────────────────────
  cookie_consent_accepted: {
    category: "Cookie Consent",
    description: "Consent accepted. Handled in code but not emitted as an event.",
    status: "planned",
    destinations: CLIENT_DEST,
  },
  cookie_consent_declined: {
    category: "Cookie Consent",
    description: "Consent declined. Handled in code but not emitted as an event.",
    status: "planned",
    destinations: CLIENT_DEST,
  },

  // ── Life events ──────────────────────────────────
  life_event_dialog_opened: {
    category: "Life Events",
    description: "Life-event creation dialog opened.",
    status: "live",
    destinations: CLIENT_DEST,
  },

  // ── Admin / debug ────────────────────────────────
  admin_test_event_fired: {
    category: "Admin / Debug",
    description: "Internal test event fired from the admin analytics harness.",
    status: "live",
    destinations: CLIENT_DEST,
  },
} satisfies Record<ClientAnalyticsEventName, EventMeta>;

// =====================================================
// FLATTENED VIEW (for the catalog UI)
// =====================================================

export type EventSurface = "server" | "client";

export interface TrackingPlanEntry extends EventMeta {
  name: string;
  surface: EventSurface;
}

export const TRACKING_PLAN: TrackingPlanEntry[] = [
  ...Object.entries(SERVER_EVENT_REGISTRY).map(
    ([name, meta]): TrackingPlanEntry => ({
      name,
      surface: "server",
      ...meta,
    }),
  ),
  ...Object.entries(CLIENT_EVENT_REGISTRY).map(
    ([name, meta]): TrackingPlanEntry => ({
      name,
      surface: "client",
      ...meta,
    }),
  ),
];
