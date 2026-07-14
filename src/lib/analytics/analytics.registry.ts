// =====================================================
// ANALYTICS TRACKING PLAN — RUNTIME REGISTRY
// =====================================================
//
// This is the runtime companion to `analytics.types.ts`.
//
// `analytics.types.ts` owns the *property shapes* (rich, type-only,
// discriminated unions — erased at runtime). `analytics.properties.ts` owns
// the human-readable *property metadata* derived from those shapes. This file
// owns the *catalog metadata* (category, description, status) and the routing
// policy (which events reach Slack) that power the /admin/tracking-plan page.
//
// The two `satisfies Record<...EventName, EventMeta>` assertions pin this
// registry to the event-name unions: add an event to the union without a
// metadata entry here (or vice-versa) and the build fails. Event names
// therefore cannot drift between the type layer and the catalog.
//
// DESTINATIONS ARE DERIVED, NOT AUTHORED:
//   - every client event → PostHog + Vercel + Amplitude
//   - every server event → PostHog + Vercel + Amplitude, plus Slack iff it is in
//     SLACK_EVENTS (the single source of truth, also consumed by the Slack
//     provider in slack.client.ts).
// So the catalog can never claim a Slack badge that the pipeline won't honor.
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
}

// =====================================================
// SLACK ROUTING POLICY (single source of truth)
// =====================================================
//
// The subset of server events that additionally fan out to Slack for operator
// visibility. Consumed by slack.client.ts (`isSlackEvent` filter) AND by the
// destination derivation below — so the catalog and the pipeline can never
// disagree about what reaches Slack.

export const SLACK_EVENTS = [
  "tinder_profile_created",
  "tinder_profile_updated",
  "tinder_profile_upload_failed",
  "hinge_profile_created",
  "hinge_profile_updated",
  "hinge_profile_upload_failed",
  "subscription_activated",
  "subscription_cancelled",
  "billing_payment_successful",
  "billing_payment_failed",
  "comparison_created",
  "comparison_shared",
  "roast_published",
  "stats_roast_shared",
] as const satisfies readonly ServerAnalyticsEventName[];

const SLACK_EVENT_SET = new Set<string>(SLACK_EVENTS);

// =====================================================
// CONSENT POLICY (server-side gating)
// =====================================================
//
// Server events split by lawful basis. OPERATIONAL events run under legitimate
// interest — they're necessary to deliver the service, bill, secure, or alert
// operators — so they fire even without `analytics` consent (still IP-dropped).
// Everything NOT in this set is behavioral product analytics and is skipped
// when the user hasn't consented to the `analytics` category. Move an event
// between the two by editing this one list.

export const OPERATIONAL_SERVER_EVENTS = new Set<ServerAnalyticsEventName>([
  // Auth / account lifecycle
  "user_signed_up",
  "user_account_created",
  "user_signed_in",
  "user_signed_out",
  // Anonymous lifecycle — fires at account creation, before any consent can
  // exist; recording the account record is a service action (legitimate
  // interest), so it isn't dropped for want of a not-yet-possible consent.
  "anonymous_user_created",
  "anonymous_user_converted",
  // Profile uploads (core service delivery + fraud/ops)
  "tinder_profile_created",
  "tinder_profile_updated",
  "tinder_profile_upload_failed",
  "hinge_profile_created",
  "hinge_profile_updated",
  "hinge_profile_merged",
  "hinge_profile_upload_failed",
  // Monetization / billing (financial record)
  "subscription_trial_started",
  "subscription_activated",
  "subscription_cancelled",
  "billing_checkout_created",
  "billing_payment_successful",
  "billing_payment_failed",
  "billing_subscription_updated",
  "dataset_checkout_created",
  "dataset_purchase_completed",
  "dataset_export_queued",
  "dataset_export_ready",
  "dataset_export_failed",
  "dataset_downloaded",
  // Internal
  "admin_test_event_fired",
]);

export const SERVER_EVENT_REGISTRY = {
  // ── Auth ─────────────────────────────────────────
  user_signed_up: {
    category: "Auth",
    description: "First account creation (anonymous, email, or OAuth).",
    status: "live",
  },
  user_account_created: {
    category: "Auth",
    description: "Email/password or OAuth credentials added to an account.",
    status: "live",
  },
  user_signed_in: {
    category: "Auth",
    description: "Returning user authenticated successfully.",
    status: "live",
  },
  user_signed_out: {
    category: "Auth",
    description: "User session ended. Currently emitted client-side only.",
    status: "planned",
  },

  // ── Anonymous (lead gen) ─────────────────────────
  anonymous_user_created: {
    category: "Anonymous",
    description: "Guest session started. Carries the entry-point source.",
    status: "live",
  },
  anonymous_user_converted: {
    category: "Anonymous",
    description: "Guest upgraded to a real account; events are aliased.",
    status: "live",
  },

  // ── Tinder profiles (core product) ───────────────
  tinder_profile_created: {
    category: "Tinder Profile",
    description: "New Tinder profile uploaded and processed successfully.",
    status: "live",
  },
  tinder_profile_updated: {
    category: "Tinder Profile",
    description: "Existing Tinder profile re-uploaded / refreshed.",
    status: "live",
  },
  tinder_profile_upload_failed: {
    category: "Tinder Profile",
    description: "Tinder upload failed (auth/ownership/database/unknown).",
    status: "live",
  },

  // ── Hinge profiles ───────────────────────────────
  hinge_profile_created: {
    category: "Hinge Profile",
    description: "New Hinge profile uploaded and processed successfully.",
    status: "live",
  },
  hinge_profile_updated: {
    category: "Hinge Profile",
    description: "Existing Hinge profile re-uploaded / refreshed.",
    status: "live",
  },
  hinge_profile_merged: {
    category: "Hinge Profile",
    description: "Two Hinge profiles merged across accounts.",
    status: "live",
  },
  hinge_profile_upload_failed: {
    category: "Hinge Profile",
    description: "Hinge upload failed (auth/ownership/database/unknown).",
    status: "live",
  },

  // ── Comparison (unique feature) ──────────────────
  comparison_created: {
    category: "Comparison",
    description: "Profile comparison created (fired from the create mutation).",
    status: "live",
  },
  comparison_shared: {
    category: "Comparison",
    description: "Comparison made public via share key (isPublic set true).",
    status: "live",
  },

  // ── Roast: profile (vision AI, per column) ───────
  roast_generated: {
    category: "Roast (Profile)",
    description: "Profile roast generated for a comparison column.",
    status: "live",
  },
  roast_published: {
    category: "Roast (Profile)",
    description: "Profile roast made public for the share page.",
    status: "live",
  },

  // ── Roast: stats (profile-level) ─────────────────
  stats_roast_generated: {
    category: "Roast (Stats)",
    description: "Profile-level stats roast generated (not a cache hit).",
    status: "live",
  },
  stats_roast_shared: {
    category: "Roast (Stats)",
    description: "Stats roast made public for the share page.",
    status: "live",
  },

  // ── Monetization (outcomes) ──────────────────────
  subscription_trial_started: {
    category: "Monetization",
    description: "User started a free trial. Not yet implemented.",
    status: "planned",
  },
  subscription_activated: {
    category: "Monetization",
    description: "User gained premium access (trial/direct/admin grant).",
    status: "live",
  },
  subscription_cancelled: {
    category: "Monetization",
    description: "User lost premium access.",
    status: "live",
  },

  // ── Billing (implementation detail) ──────────────
  billing_checkout_created: {
    category: "Billing",
    description:
      "Subscription checkout session created by the billing provider.",
    status: "live",
  },
  billing_payment_successful: {
    category: "Billing",
    description: "Payment processed successfully (webhook).",
    status: "live",
  },
  billing_payment_failed: {
    category: "Billing",
    description: "Payment failed. Handler ready; not yet confirmed firing.",
    status: "planned",
  },
  billing_subscription_updated: {
    category: "Billing",
    description: "Subscription modified (plan/payment/billing details).",
    status: "live",
  },
  dataset_checkout_created: {
    category: "Research Dataset Billing",
    description: "Dataset checkout session created by the billing provider.",
    status: "live",
  },
  dataset_purchase_completed: {
    category: "Research Dataset Billing",
    description: "Dataset license key created after purchase.",
    status: "live",
  },
  dataset_export_queued: {
    category: "Research Dataset Fulfillment",
    description: "Dataset export record queued for generation.",
    status: "live",
  },
  dataset_export_ready: {
    category: "Research Dataset Fulfillment",
    description: "Dataset export generated and ready to download.",
    status: "live",
  },
  dataset_export_failed: {
    category: "Research Dataset Fulfillment",
    description: "Dataset export generation failed.",
    status: "live",
  },
  dataset_downloaded: {
    category: "Research Dataset Fulfillment",
    description: "Purchased dataset file downloaded.",
    status: "live",
  },

  // ── Life events (engagement) ─────────────────────
  life_event_created: {
    category: "Life Events",
    description: "User created a life event on their timeline.",
    status: "live",
  },
  life_event_updated: {
    category: "Life Events",
    description: "User updated an existing life event.",
    status: "live",
  },
  life_event_deleted: {
    category: "Life Events",
    description: "User deleted a life event.",
    status: "live",
  },

  // ── Admin / debug ────────────────────────────────
  admin_test_event_fired: {
    category: "Admin / Debug",
    description: "Internal test event fired from the admin analytics harness.",
    status: "live",
  },
} satisfies Record<ServerAnalyticsEventName, EventMeta>;

export const CLIENT_EVENT_REGISTRY = {
  // ── Navigation ───────────────────────────────────
  page_viewed: {
    category: "Navigation",
    description: "Route navigation. PostHog handles pageviews natively today.",
    status: "planned",
  },
  blog_product_card_clicked: {
    category: "Blog Conversion",
    description:
      "Contextual blog product card clicked, including source post and destination product.",
    status: "live",
  },
  sponsor_impression: {
    category: "Sponsorship",
    description:
      "A sponsorship placement became visible, attributed to its campaign and surface.",
    status: "live",
  },
  sponsor_clicked: {
    category: "Sponsorship",
    description: "A paid sponsor destination was opened.",
    status: "live",
  },
  sponsor_inquiry_clicked: {
    category: "Sponsorship",
    description: "The SwipeStats sponsorship inquiry CTA was clicked.",
    status: "live",
  },
  sponsor_dismissed: {
    category: "Sponsorship",
    description: "A dismissible sponsorship placement was closed.",
    status: "live",
  },

  // ── Auth UI ──────────────────────────────────────
  sign_up_clicked: {
    category: "Auth UI",
    description: "User clicked a sign-up affordance.",
    status: "planned",
  },
  sign_in_clicked: {
    category: "Auth UI",
    description: "User clicked a sign-in affordance.",
    status: "planned",
  },
  sign_out_clicked: {
    category: "Auth UI",
    description: "User clicked sign out (user dropdown).",
    status: "live",
  },

  // ── Conversion funnel ────────────────────────────
  conversion_dialog_opened: {
    category: "Conversion Funnel",
    description: "Anonymous→real conversion dialog shown.",
    status: "planned",
  },
  conversion_dialog_dismissed: {
    category: "Conversion Funnel",
    description: "Conversion dialog dismissed without converting.",
    status: "planned",
  },
  conversion_dialog_tab_changed: {
    category: "Conversion Funnel",
    description: "Switched between create/sign-in tabs in the dialog.",
    status: "planned",
  },

  // ── Upload flow ──────────────────────────────────
  upload_started: {
    category: "Upload Flow",
    description: "Upload flow entered. Not yet instrumented.",
    status: "planned",
  },
  upload_file_selected: {
    category: "Upload Flow",
    description: "File chosen. Not yet instrumented.",
    status: "planned",
  },
  upload_provider_selected: {
    category: "Upload Flow",
    description: "Dating provider chosen in the upload or request guide.",
    status: "live",
  },
  upload_file_processing_started: {
    category: "Upload Flow",
    description: "File processing began (drag or click).",
    status: "live",
  },
  upload_file_read_failed: {
    category: "Upload Flow",
    description: "File unreadable (read / zip extraction / JSON parse).",
    status: "live",
  },
  upload_validation_failed: {
    category: "Upload Flow",
    description: "Upload missing required fields.",
    status: "live",
  },
  upload_preview_loaded: {
    category: "Upload Flow",
    description: "Preview reached — key success milestone.",
    status: "live",
  },
  upload_consent_photos_toggled: {
    category: "Upload Flow",
    description: "User changed photo-sharing consent during upload.",
    status: "live",
  },
  upload_consent_work_toggled: {
    category: "Upload Flow",
    description: "User changed work-data consent during upload.",
    status: "live",
  },
  upload_gender_corrected: {
    category: "Upload Flow",
    description: "User manually corrected gender fields (Tinder).",
    status: "live",
  },
  upload_submit_clicked: {
    category: "Upload Flow",
    description: "User clicked submit on the upload preview.",
    status: "live",
  },

  // ── Data request guide ───────────────────────────
  data_request_official_link_clicked: {
    category: "Data Request Flow",
    description:
      "Official Tinder, Hinge, or Bumble request destination opened from the guide.",
    status: "live",
  },
  data_request_upload_clicked: {
    category: "Data Request Flow",
    description: "Upload CTA clicked from the data-request journey.",
    status: "live",
  },
  data_request_reminder_clicked: {
    category: "Data Request Flow",
    description:
      "Reminder CTA or reminder form submitted from the data-request journey.",
    status: "live",
  },

  // ── Insights ─────────────────────────────────────
  insights_tab_changed: {
    category: "Insights",
    description: "Switched tabs in the insights view. Not yet instrumented.",
    status: "planned",
  },

  // ── Monetization funnel ──────────────────────────
  upgrade_modal_opened: {
    category: "Monetization Funnel",
    description: "Upgrade modal opened.",
    status: "live",
  },
  upgrade_modal_dismissed: {
    category: "Monetization Funnel",
    description: "Upgrade modal dismissed. Not yet instrumented.",
    status: "planned",
  },
  upgrade_plan_selected: {
    category: "Monetization Funnel",
    description: "A plan was selected in the upgrade flow.",
    status: "live",
  },
  upgrade_checkout_clicked: {
    category: "Monetization Funnel",
    description: "Checkout triggered from the upgrade flow.",
    status: "live",
  },
  dataset_checkout_clicked: {
    category: "Research Dataset Funnel",
    description: "Dataset checkout CTA clicked.",
    status: "live",
  },
  dataset_academic_inquiry_clicked: {
    category: "Research Dataset Funnel",
    description: "Academic dataset inquiry CTA clicked.",
    status: "live",
  },

  // ── Cookie consent ───────────────────────────────
  cookie_consent_accepted: {
    category: "Cookie Consent",
    description:
      "Consent accepted. Handled in code but not emitted as an event.",
    status: "planned",
  },
  cookie_consent_declined: {
    category: "Cookie Consent",
    description:
      "Consent declined. Handled in code but not emitted as an event.",
    status: "planned",
  },

  // ── Life events ──────────────────────────────────
  life_event_dialog_opened: {
    category: "Life Events",
    description: "Life-event creation dialog opened.",
    status: "live",
  },

  // ── Roast & comparison share ─────────────────────
  roast_dialog_opened: {
    category: "Roast (Profile)",
    description: "Roast dialog opened for a column. Not yet instrumented.",
    status: "planned",
  },
  roast_tone_selected: {
    category: "Roast (Profile)",
    description:
      "User picked a roast tone (incl. re-roast). Not yet instrumented.",
    status: "planned",
  },
  roast_shared_viewed: {
    category: "Roast (Profile)",
    description:
      "Public profile-roast share page viewed. Not yet instrumented.",
    status: "planned",
  },
  comparison_shared_viewed: {
    category: "Comparison",
    description: "Public comparison share page viewed. Not yet instrumented.",
    status: "planned",
  },

  // ── Admin / debug ────────────────────────────────
  admin_test_event_fired: {
    category: "Admin / Debug",
    description: "Internal test event fired from the admin analytics harness.",
    status: "live",
  },
} satisfies Record<ClientAnalyticsEventName, EventMeta>;

// =====================================================
// FLATTENED VIEW (for the catalog UI)
// =====================================================

export type EventSurface = "server" | "client";

export interface TrackingPlanEntry extends EventMeta {
  name: string;
  surface: EventSurface;
  destinations: AnalyticsDestination[];
}

/** Derive destinations from surface + Slack routing policy. */
function serverDestinations(name: string): AnalyticsDestination[] {
  const base: AnalyticsDestination[] = ["posthog", "vercel", "amplitude"];
  return SLACK_EVENT_SET.has(name) ? [...base, "slack"] : base;
}

const CLIENT_DESTINATIONS: AnalyticsDestination[] = [
  "posthog",
  "vercel",
  "amplitude",
];

export const TRACKING_PLAN: TrackingPlanEntry[] = [
  ...Object.entries(SERVER_EVENT_REGISTRY).map(
    ([name, meta]): TrackingPlanEntry => ({
      name,
      surface: "server",
      destinations: serverDestinations(name),
      ...meta,
    }),
  ),
  ...Object.entries(CLIENT_EVENT_REGISTRY).map(
    ([name, meta]): TrackingPlanEntry => ({
      name,
      surface: "client",
      destinations: CLIENT_DESTINATIONS,
      ...meta,
    }),
  ),
];
