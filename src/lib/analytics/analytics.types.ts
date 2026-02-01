// =====================================================
// EVENT NAME DEFINITIONS
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
  // Profile events (Core product value)
  // ─────────────────────────────────────────────────
  | "profile_uploaded" // Tinder/Hinge data uploaded successfully
  | "profile_upload_failed" // Upload failed (for debugging)

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
  | "billing_subscription_updated"; // Subscription modified

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
  | "conversion_modal_opened" // Modal shown to anonymous user
  | "conversion_modal_dismissed" // User dismissed without converting
  | "conversion_modal_tab_changed" // Switched between signup/signin

  // ─────────────────────────────────────────────────
  // Upload flow
  // ─────────────────────────────────────────────────
  | "upload_started"
  | "upload_file_selected"
  | "upload_provider_selected" // User chose Tinder/Hinge/Bumble

  // ─────────────────────────────────────────────────
  // Insights interactions
  // ─────────────────────────────────────────────────
  | "insights_chart_interacted"
  | "insights_tab_changed"

  // ─────────────────────────────────────────────────
  // Comparison interactions
  // ─────────────────────────────────────────────────
  | "comparison_filter_changed"

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
  | "cookie_consent_declined";

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
  // Profile events
  // ─────────────────────────────────────────────────
  profile_uploaded: {
    provider: "tinder" | "hinge" | "bumble";
    matchCount: number;
    messageCount: number;
    hasPhotos: boolean;
    isUpdate: boolean; // Re-upload vs first upload
  };

  profile_upload_failed: {
    provider: "tinder" | "hinge" | "bumble";
    errorType: "validation" | "parsing" | "database" | "unknown";
    errorMessage?: string;
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
  conversion_modal_opened: {
    reason: "upload_limit" | "feature_gate" | "share_prompt" | "manual";
    hasProfile: boolean;
  };

  conversion_modal_dismissed: {
    reason: "upload_limit" | "feature_gate" | "share_prompt" | "manual";
    timeSpentSeconds: number;
  };

  conversion_modal_tab_changed: {
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

  // ─────────────────────────────────────────────────
  // Insights interactions
  // ─────────────────────────────────────────────────
  insights_chart_interacted: {
    chartType: string;
    action: "zoom" | "hover" | "filter" | "export";
  };

  insights_tab_changed: {
    from: string;
    to: string;
  };

  // ─────────────────────────────────────────────────
  // Comparison interactions
  // ─────────────────────────────────────────────────
  comparison_filter_changed: {
    filterType: string;
    value: string;
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
