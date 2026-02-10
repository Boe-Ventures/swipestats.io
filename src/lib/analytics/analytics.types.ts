// =====================================================
// EVENT NAME DEFINITIONS
// =====================================================
//
// NAMING CONVENTIONS:
//
// Server Events (past tense - completed actions):
//   - {resource}_{past_tense_verb}: user_signed_up, profile_uploaded, subscription_activated
//   - Describes what actually happened in the database/backend
//
// Client Events (present tense + action verb - user interactions):
//   - {resource}_{action}_clicked: sign_up_clicked, upgrade_clicked
//   - {resource}_dialog_opened: event_dialog_opened, upgrade_dialog_opened
//   - {resource}_toggled: theme_toggled, settings_toggled
//   - Describes user UI interactions, not outcomes
//
// Pattern: Track clicks (not useEffect/dialog state) to avoid duplicates
// =====================================================

export type ServerAnalyticsEventName =
  // ─────────────────────────────────────────────────
  // User authentication events
  // ─────────────────────────────────────────────────
  | "user_signed_up" //✅ First account creation (anonymous or email)
  | "user_account_created" //✅ Added email/password or OAuth credentials
  | "user_signed_in" // ✅
  | "user_signed_out" // ✅

  // ─────────────────────────────────────────────────
  // Anonymous user events (Lead generation)
  // ─────────────────────────────────────────────────
  | "anonymous_user_created" // Guest started using app
  | "anonymous_user_converted" // Guest → Real account

  // ─────────────────────────────────────────────────
  // Tinder Profile events (Core product - 99% of usage)
  // ─────────────────────────────────────────────────
  | "tinder_profile_created" // New Tinder profile uploaded successfully
  | "tinder_profile_updated" // Existing Tinder profile updated successfully
  | "tinder_profile_upload_failed" // Tinder upload failed (for debugging)

  // ─────────────────────────────────────────────────
  // Hinge Profile events (New feature)
  // ─────────────────────────────────────────────────
  | "hinge_profile_created" // New Hinge profile uploaded successfully
  | "hinge_profile_updated" // Existing Hinge profile updated successfully
  | "hinge_profile_merged" // Hinge profiles merged (cross-account)
  | "hinge_profile_upload_failed" // Hinge upload failed (for debugging)

  // ─────────────────────────────────────────────────
  // Comparison events (Unique feature)
  // ─────────────────────────────────────────────────
  | "comparison_created" // Profile comparison created
  | "comparison_shared" // Comparison made public

  // ─────────────────────────────────────────────────
  // Monetization events (Product Outcomes)
  // Use these for revenue analysis and user journey
  // ─────────────────────────────────────────────────
  | "subscription_trial_started" // User started free trial
  | "subscription_activated" // User got premium access
  | "subscription_cancelled" // User lost premium access

  // ─────────────────────────────────────────────────
  // Billing events (Implementation Details)
  // Use these for debugging and reconciliation
  // ─────────────────────────────────────────────────
  | "billing_checkout_created" // LemonSqueezy checkout initiated
  | "billing_payment_successful" // Payment processed successfully
  | "billing_payment_failed" // Payment failed
  | "billing_subscription_updated" // Subscription modified

  // ─────────────────────────────────────────────────
  // Life Events (Feature engagement)
  // ─────────────────────────────────────────────────
  | "life_event_created" // User created a life event
  | "life_event_updated" // User updated an existing event
  | "life_event_deleted"; // User deleted an event

export type ClientAnalyticsEventName =
  // ─────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────
  | "page_viewed"

  // ─────────────────────────────────────────────────
  // User authentication UI
  // ─────────────────────────────────────────────────
  | "sign_up_clicked"
  | "sign_in_clicked"
  | "sign_out_clicked"

  // ─────────────────────────────────────────────────
  // Anonymous conversion funnel
  // ─────────────────────────────────────────────────
  | "conversion_dialog_opened" // Dialog shown to anonymous user
  | "conversion_dialog_dismissed" // User dismissed without converting
  | "conversion_dialog_tab_changed" // Switched between signup/signin

  // ─────────────────────────────────────────────────
  // Upload flow
  // ─────────────────────────────────────────────────
  | "upload_started"
  | "upload_file_selected"
  | "upload_provider_selected" // User chose Tinder/Hinge/Bumble
  | "upload_file_processing_started" // File selected (drag or click)
  | "upload_file_read_failed" // Cannot read file (includes ZIP extraction, JSON parse)
  | "upload_validation_failed" // Missing required fields
  | "upload_preview_loaded" // Successfully reached preview (success milestone!)
  | "upload_consent_photos_toggled" // User changed photo consent
  | "upload_consent_work_toggled" // User changed work consent
  | "upload_gender_corrected" // User manually fixed gender (Tinder only)
  | "upload_submit_clicked" // User clicked submit button

  // ─────────────────────────────────────────────────
  // Insights interactions
  // ─────────────────────────────────────────────────
  | "insights_tab_changed"

  // ─────────────────────────────────────────────────
  // Monetization funnel
  // ─────────────────────────────────────────────────
  | "upgrade_modal_opened"
  | "upgrade_modal_dismissed"
  | "upgrade_plan_selected"
  | "upgrade_checkout_clicked"

  // ─────────────────────────────────────────────────
  // Cookie consent
  // ─────────────────────────────────────────────────
  | "cookie_consent_accepted"
  | "cookie_consent_declined"

  // ─────────────────────────────────────────────────
  // Life Events (Feature engagement)
  // ─────────────────────────────────────────────────
  | "life_event_dialog_opened";

// =====================================================
// EVENT PROPERTIES DEFINITIONS - SERVER
// =====================================================

type EmailAndPasswordMethod = "email";
type OAuthMethod = "oauth";
type SupportedAuthProvider = "google";

export type ServerEventPropertiesDefinition = {
  // ─────────────────────────────────────────────────
  // User authentication events
  // ─────────────────────────────────────────────────
  user_signed_up:
    | {
        method: "anonymous";
      }
    | {
        method: EmailAndPasswordMethod;
        email: string;
      }
    | {
        method: OAuthMethod;
        provider: SupportedAuthProvider;
      };

  user_account_created:
    | {
        method: EmailAndPasswordMethod;
      }
    | {
        method: OAuthMethod;
        provider: SupportedAuthProvider;
      };

  user_signed_in: Record<string, never>;

  user_signed_out: undefined;

  // ─────────────────────────────────────────────────
  // Anonymous user events
  // ─────────────────────────────────────────────────
  anonymous_user_created: {
    source: "upload_flow" | "comparison_view" | "direct";
  };

  anonymous_user_converted: {
    previousUserId: string;
    hadProfile: boolean;
    daysSinceCreation: number;
  };

  // ─────────────────────────────────────────────────
  // Tinder Profile events
  // ─────────────────────────────────────────────────
  tinder_profile_created: {
    tinderId: string;
    matchCount: number;
    messageCount: number;
    photoCount: number;
    usageDays: number;
    hasPhotos: boolean;
    processingTimeMs: number;
    jsonSizeMB: number;
    consentPhotos: boolean;
    consentWork: boolean;
  };

  tinder_profile_updated: {
    tinderId: string;
    matchCount: number;
    messageCount: number;
    photoCount: number;
    usageDays: number;
    hasPhotos: boolean;
    processingTimeMs: number;
    jsonSizeMB: number;
    consentPhotos: boolean;
    consentWork: boolean;
  };

  tinder_profile_upload_failed: {
    tinderId?: string; // Optional - might fail before ID is known
    errorType: "auth" | "ownership" | "database" | "unknown";
    errorMessage: string;
    jsonSizeMB?: number;
  };

  // ─────────────────────────────────────────────────
  // Hinge Profile events
  // ─────────────────────────────────────────────────
  hinge_profile_created: {
    hingeId: string;
    matchCount: number;
    messageCount: number;
    photoCount: number;
    promptCount: number;
    interactionCount: number;
    hasPhotos: boolean;
    processingTimeMs: number;
    jsonSizeMB: number;
    consentPhotos: boolean;
    consentWork: boolean;
  };

  hinge_profile_updated: {
    hingeId: string;
    matchCount: number;
    messageCount: number;
    photoCount: number;
    promptCount: number;
    interactionCount: number;
    hasPhotos: boolean;
    processingTimeMs: number;
    jsonSizeMB: number;
    consentPhotos: boolean;
    consentWork: boolean;
  };

  hinge_profile_merged: {
    hingeId: string;
    oldHingeId: string;
    matchCount: number;
    messageCount: number;
    photoCount: number;
    promptCount: number;
    interactionCount: number;
    hasPhotos: boolean;
    processingTimeMs: number;
    jsonSizeMB: number;
    consentPhotos: boolean;
    consentWork: boolean;
  };

  hinge_profile_upload_failed: {
    hingeId?: string; // Optional - might fail before ID is known
    errorType: "auth" | "ownership" | "database" | "unknown";
    errorMessage: string;
    jsonSizeMB?: number;
  };

  // ─────────────────────────────────────────────────
  // Comparison events
  // ─────────────────────────────────────────────────
  comparison_created: {
    comparisonId: string;
    columnCount: number;
    hasCustomPhotos: boolean;
  };

  comparison_shared: {
    comparisonId: string;
    shareKey: string;
  };

  // ─────────────────────────────────────────────────
  // Monetization events (Product Outcomes)
  // ─────────────────────────────────────────────────
  subscription_trial_started: {
    tier: "PLUS" | "ELITE";
    trialDurationDays: number;
  };

  subscription_activated: {
    tier: "PLUS" | "ELITE";
    source: "trial_conversion" | "direct_purchase" | "admin_grant";
    billingPeriod?: "monthly" | "annual" | "lifetime";
  };

  subscription_cancelled: {
    tier: "PLUS" | "ELITE";
    reason: "user_requested" | "payment_failed" | "admin_action";
    hadActiveSubscription: boolean;
  };

  // ─────────────────────────────────────────────────
  // Billing events (Implementation Details)
  // ─────────────────────────────────────────────────
  billing_checkout_created: {
    checkoutUrl: string;
    tier: "PLUS" | "ELITE";
    billingPeriod: "monthly" | "annual" | "lifetime";
    amount: number;
    currency: string;
  };

  billing_payment_successful: {
    orderId: string;
    subscriptionId: string | null;
    amount: number;
    currency: string;
    tier: "PLUS" | "ELITE";
    billingPeriod: "monthly" | "annual" | "lifetime";
  };

  billing_payment_failed: {
    subscriptionId: string | null;
    amount: number;
    currency: string;
    errorCode?: string;
    errorMessage?: string;
  };

  billing_subscription_updated: {
    subscriptionId: string;
    changeType:
      | "plan_changed"
      | "payment_method_updated"
      | "billing_details_updated";
    previousTier?: "PLUS" | "ELITE";
    newTier?: "PLUS" | "ELITE";
  };

  // ─────────────────────────────────────────────────
  // Life Events
  // ─────────────────────────────────────────────────
  life_event_created: {
    eventType: string; // EventType from schema
    hasEndDate: boolean;
    hasLocation: boolean;
  };

  life_event_updated: {
    eventType: string;
    previousEventType?: string; // If type changed
    changedEndDate: boolean;
    changedLocation: boolean;
  };

  life_event_deleted: {
    eventType: string;
    hadEndDate: boolean;
    hadLocation: boolean;
  };
};

// =====================================================
// EVENT PROPERTIES DEFINITIONS - CLIENT
// =====================================================

export type ClientEventPropertiesDefinition = {
  // ─────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────
  page_viewed: {
    path: string;
    referrer?: string;
  };

  // ─────────────────────────────────────────────────
  // User authentication UI
  // ─────────────────────────────────────────────────
  sign_up_clicked:
    | {
        method: EmailAndPasswordMethod;
        source: "conversion_modal" | "signin_page" | "navbar";
      }
    | {
        method: OAuthMethod;
        provider: SupportedAuthProvider;
        source: "conversion_modal" | "signin_page" | "navbar";
      };

  sign_in_clicked:
    | {
        method: "username" | "email";
        source: "conversion_modal" | "signin_page" | "navbar";
      }
    | {
        method: OAuthMethod;
        provider: SupportedAuthProvider;
        source: "conversion_modal" | "signin_page" | "navbar";
      };

  sign_out_clicked: undefined;

  // ─────────────────────────────────────────────────
  // Anonymous conversion funnel
  // ─────────────────────────────────────────────────
  conversion_dialog_opened: {
    reason: "upload_limit" | "feature_gate" | "share_prompt" | "manual";
    hasProfile: boolean;
  };

  conversion_dialog_dismissed: {
    reason: "upload_limit" | "feature_gate" | "share_prompt" | "manual";
    timeSpentSeconds: number;
  };

  conversion_dialog_tab_changed: {
    from: "create" | "signin";
    to: "create" | "signin";
  };

  // ─────────────────────────────────────────────────
  // Upload flow
  // ─────────────────────────────────────────────────
  upload_started: {
    source: "dashboard" | "landing_page" | "navbar";
  };

  upload_file_selected: {
    provider: "tinder" | "hinge" | "bumble";
    fileSize: number;
    isReupload: boolean;
  };

  upload_provider_selected: {
    provider: "tinder" | "hinge" | "bumble";
    source: "upload_modal" | "instructions_page";
  };

  upload_file_processing_started: {
    provider: "tinder" | "hinge";
    fileSize: number;
    fileType: string; // ".zip" or ".json"
  };

  upload_file_read_failed: {
    provider: "tinder" | "hinge";
    fileSize: number;
    fileType: string; // ".zip" or ".json"
    errorType: "file_read" | "zip_extraction" | "json_parse";
    errorMessage: string;
    filesInZip?: number; // Only for zip_extraction errors
  };

  upload_validation_failed: {
    provider: "tinder" | "hinge";
    missingFields: string[];
    errorMessage: string;
  };

  upload_preview_loaded: {
    provider: "tinder" | "hinge";
    tinderId?: string; // Available from this point onwards (Tinder)
    hingeId?: string; // Available from this point onwards (Hinge)
    fileSizeMB: number;
    matchCount: number;
    messageCount: number;
    photoCount: number; // Always present, 0 if no consent
    hasPhotos: boolean; // Actual data presence
    hasPhotosConsent: boolean; // User consent state
    usageDays?: number; // Tinder only
    hasWork?: boolean; // Tinder only - actual data presence
    hasWorkConsent?: boolean; // Tinder only - user consent state
    promptCount?: number; // Hinge only
    hasUnknownGender?: boolean; // Tinder only
  };

  upload_consent_photos_toggled: {
    provider: "tinder" | "hinge";
    tinderId?: string;
    hingeId?: string;
    consentGiven: boolean;
  };

  upload_consent_work_toggled: {
    provider: "tinder" | "hinge";
    tinderId?: string;
    hingeId?: string;
    consentGiven: boolean;
  };

  upload_gender_corrected: {
    tinderId?: string; // Tinder only
    hadUnknownGender: boolean;
    hadUnknownInterestedIn: boolean;
    hadUnknownGenderFilter: boolean;
  };

  upload_submit_clicked: {
    provider: "tinder" | "hinge";
    tinderId?: string;
    hingeId?: string;
    photoCount: number; // Always present, 0 if no consent
    hasPhotos: boolean; // Actual data presence
    hasPhotosConsent: boolean; // User consent state
    hasWork?: boolean; // Tinder only - actual data presence
    hasWorkConsent?: boolean; // Tinder only - user consent state
    matchCount: number;
    scenario?: string; // Upload scenario context
  };

  // ─────────────────────────────────────────────────
  // Insights interactions
  // ─────────────────────────────────────────────────
  insights_tab_changed: {
    from: string;
    to: string;
  };

  // ─────────────────────────────────────────────────
  // Monetization funnel
  // ─────────────────────────────────────────────────
  upgrade_modal_opened: {
    source: "feature_gate" | "pricing_page" | "settings" | "banner";
    currentTier: "FREE" | "PLUS" | "ELITE";
    blockedFeature?: string;
  };

  upgrade_modal_dismissed: {
    source: "feature_gate" | "pricing_page" | "settings" | "banner";
    timeSpentSeconds: number;
    viewedPlans: Array<"PLUS" | "ELITE">;
  };

  upgrade_plan_selected: {
    tier: "PLUS" | "ELITE";
    billingPeriod: "monthly" | "annual" | "lifetime";
    price: number;
  };

  upgrade_checkout_clicked: {
    tier: "PLUS" | "ELITE";
    billingPeriod: "monthly" | "annual" | "lifetime";
    price: number;
  };

  // ─────────────────────────────────────────────────
  // Cookie consent
  // ─────────────────────────────────────────────────
  cookie_consent_accepted: undefined;
  cookie_consent_declined: undefined;

  // ─────────────────────────────────────────────────
  // Life Events
  // ─────────────────────────────────────────────────
  life_event_dialog_opened: {
    source: "dashboard" | "insights_page";
    trigger: "card_click" | "button_click"; // What UI element was clicked
    hasExistingEvents: boolean;
    eventCount: number;
  };
};

// =====================================================
// EXHAUSTIVENESS VALIDATION
// =====================================================

// Helper type - will show TypeScript error if any event is missing properties
type EnsureExhaustiveServerEvents<T> = {
  [K in ServerAnalyticsEventName]: K extends keyof T
    ? T[K]
    : `Missing server event: ${K}`;
};

type EnsureExhaustiveClientEvents<T> = {
  [K in ClientAnalyticsEventName]: K extends keyof T
    ? T[K]
    : `Missing client event: ${K}`;
};

// These enforce exhaustiveness at compile-time
export type ServerEventPropertiesMap =
  EnsureExhaustiveServerEvents<ServerEventPropertiesDefinition>;
export type ClientEventPropertiesMap =
  EnsureExhaustiveClientEvents<ClientEventPropertiesDefinition>;

// =====================================================
// METADATA & TRAITS
// =====================================================

export interface AnalyticsMetadata {
  timestamp?: Date;
  groups?: never;
  // no groups in swipestats yet
  ip?: string; // Client IP for PostHog GeoIP (auto-extracted if not provided)
  isAnonymous?: boolean; // Skip certain providers (like email) for anonymous users
}

export interface UserTraits {
  email?: string;
  name?: string;
  username?: string;
  isAnonymous?: boolean;
  swipestatsTier?: string;
  city?: string;
  country?: string;
  [key: string]: unknown;
}

// =====================================================
// COMPILE-TIME VALIDATION
// =====================================================

type ValidateServerEvents =
  keyof ServerEventPropertiesDefinition extends ServerAnalyticsEventName
    ? ServerAnalyticsEventName extends keyof ServerEventPropertiesDefinition
      ? true
      : `Extra server events found: ${Exclude<keyof ServerEventPropertiesDefinition, ServerAnalyticsEventName>}`
    : `Missing server events: ${Exclude<ServerAnalyticsEventName, keyof ServerEventPropertiesDefinition>}`;

type ValidateClientEvents =
  keyof ClientEventPropertiesDefinition extends ClientAnalyticsEventName
    ? ClientAnalyticsEventName extends keyof ClientEventPropertiesDefinition
      ? true
      : `Extra client events found: ${Exclude<keyof ClientEventPropertiesDefinition, ClientAnalyticsEventName>}`
    : `Missing client events: ${Exclude<ClientAnalyticsEventName, keyof ClientEventPropertiesDefinition>}`;

// Compile-time assertions
const _serverEventsValidation: ValidateServerEvents = true;
const _clientEventsValidation: ValidateClientEvents = true;

// Prevent unused variable warnings
export const __typeValidation = {
  _serverEventsValidation,
  _clientEventsValidation,
};
