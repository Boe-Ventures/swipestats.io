// =====================================================
// EVENT NAME DEFINITIONS
// =====================================================

export type ServerAnalyticsEventName =
  // User authentication events
  | "user_signed_up_anonymous"
  | "user_signed_up_email"
  | "user_signed_in"
  | "user_signed_out"

  // Profile events
  | "profile_uploaded"
  | "profile_insights_viewed"
  | "profile_comparison_created"

  // Monetization events
  | "upgrade_initiated"
  | "upgrade_completed"
  | "subscription_cancelled";

export type ClientAnalyticsEventName =
  // Navigation
  | "page_viewed"

  // Upload flow
  | "upload_started"
  | "upload_file_selected"

  // Insights interactions
  | "insights_chart_interacted"

  // Comparison interactions
  | "comparison_filter_changed"

  // Monetization
  | "upgrade_modal_opened"
  | "upgrade_modal_closed"

  // Cookie consent
  | "cookie_consent_accepted"
  | "cookie_consent_declined";

// =====================================================
// EVENT PROPERTIES DEFINITIONS
// =====================================================

export type ServerEventPropertiesDefinition = {
  // User authentication events
  user_signed_up_anonymous: undefined;
  user_signed_up_email: {
    email: string;
    previouslyAnonymous: boolean;
  };
  user_signed_in: {
    method: "email" | "oauth";
  };
  user_signed_out: undefined;

  // Profile events
  profile_uploaded: {
    provider: "tinder" | "hinge" | "bumble";
    matchCount: number;
    messageCount: number;
    hasPhotos: boolean;
  };
  profile_insights_viewed: {
    profileId: string;
    provider: "tinder" | "hinge" | "bumble";
  };
  profile_comparison_created: {
    profileId: string;
    cohortType: string;
  };

  // Monetization events
  upgrade_initiated: {
    tier: "PLUS" | "ELITE";
    source: string;
  };
  upgrade_completed: {
    tier: "PLUS" | "ELITE";
    billingPeriod: "monthly" | "annual";
    amount: number;
  };
  subscription_cancelled: {
    tier: "PLUS" | "ELITE";
    reason?: string;
  };
};

export type ClientEventPropertiesDefinition = {
  // Navigation
  page_viewed: {
    path: string;
  };

  // Upload flow
  upload_started: {
    provider: "tinder" | "hinge" | "bumble";
  };
  upload_file_selected: {
    provider: "tinder" | "hinge" | "bumble";
    fileSize: number;
  };

  // Insights interactions
  insights_chart_interacted: {
    chartType: string;
    action: "zoom" | "filter" | "export";
  };

  // Comparison interactions
  comparison_filter_changed: {
    filterType: string;
    value: string;
  };

  // Monetization
  upgrade_modal_opened: {
    source: string;
    currentTier: "FREE" | "PLUS" | "ELITE";
  };
  upgrade_modal_closed: {
    action: "dismissed" | "upgraded";
  };

  // Cookie consent
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
  // no groups in swipestas yet
  ip?: string; // Client IP for PostHog GeoIP (auto-extracted if not provided)
  isAnonymous?: boolean; // Skip certain providers (like Loops) for anonymous users
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
