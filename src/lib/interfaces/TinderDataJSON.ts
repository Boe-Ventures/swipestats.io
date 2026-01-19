/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { DateValueMap, DateString } from "./utilInterfaces";

export interface SwipestatsProfilePayload {
  tinderId: string;
  anonymizedTinderJson: AnonymizedTinderDataJSON;
}

// New photo format used in newer Tinder data exports (2025+)
export interface TinderPhoto {
  id: string;
  created_at: string;
  type: string;
  url: string;
  updated_at: string;
  selfie_verified?: boolean;
  prompt_id: string | null;
  prompt_text?: string | null;
  filename: string;
  fb_id?: string;
}

interface TinderDataJSONBase {
  Usage: Usage;
  Campaigns: Campaigns;
  Experiences: Experiences;
  Purchases: Purchases;
  Photos: string[] | TinderPhoto[]; // Old format: string[], New format: TinderPhoto[]
  Spotify: Spotify;
  Messages: TinderJsonMatch[];
  RoomsAndInteractions?: RoomsAndInteractions; // Optional - not present in newer exports
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SwipeNotes: any[];
  SwipeParty?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assignments: any[];
  };
  StudentVerifications?: StudentVerifications;
  // New fields found in both old and new exports
  SocialGraph?: {
    mutuals: null | unknown;
  };
  // New fields only in newer exports (2025+)
  ReportContent?: unknown[];
  Tailor?: {
    insights: unknown[];
    questions: {
      questions_answers: unknown[];
      questions_user_metadata: Record<string, unknown>;
    };
  };
  ShareMyDate?: boolean;
}

export interface AnonymizedTinderDataJSON extends TinderDataJSONBase {
  User: AnonymizedTinderUser;
}

export interface FullTinderDataJSON extends TinderDataJSONBase {
  User: FullTinderUser;
}

export interface Usage {
  app_opens: DateValueMap;
  swipes_likes: DateValueMap;
  swipes_passes: DateValueMap;
  superlikes?: DateValueMap;
  matches: DateValueMap;
  messages_sent: DateValueMap;
  messages_received: DateValueMap;
  advertising_id: Record<string, string>;
  idfa: Record<string, string>;
}
export const TinderJsonGenderValues = [
  "M",
  "F",
  "Other",
  "More",
  "Unknown",
] as const;
export type TinderJsonGender = (typeof TinderJsonGenderValues)[number];
interface TinderUserBase {
  // TODO: Probably move all Date to DateString
  active_time: Date;
  age_filter_max: number;
  age_filter_min: number;
  birth_date: DateString;
  create_date: DateString;

  gender: TinderJsonGender;
  genders?: string;
  gender_extended?: string; // usually ""
  gender_filter: TinderJsonGender;
  interested_in: TinderJsonGender;
  interested_in_genders?: TinderJsonGender;
  bio?: string;
  city?: City;
  connection_count?: number;
  education: string; // I think this is depreciated

  interests?: Interest[];
  ip_address: string;
  is_traveling: boolean;
  jobs?: Job[];

  pos: Pos;
  schools?: School[];
  travel_location_info: TravelLocationInfo[];
  client_registration_info?: {
    platform: "ios" | "android" | string;
    app_version: number;
  };
  travel_pos: TravelPos;

  college: unknown[];
  user_interests?: string[]; //  "Fashion","Grab a drink","Cooking","Brunch","Wine"
  sexual_orientations?: string[] | string; // ['str'] || Straight

  descriptors?: Descriptor[]; // NOTE: Ethnicity/race data is NOT included in Tinder data exports

  // New fields in 2025+ exports (not currently extracted to DB)
  account_source?: string; // "sms", "facebook", etc.
  // TODO: Consider extracting distance_filter to DB for analytics
  distance_filter?: number; // Search radius in miles/km
  selfie_verification?: string; // "verified", "not_verified", etc.
  onboarded_at?: string; // ISO date string
  show_gender_on_profile?: boolean;
  display_genders?: string[];
  display_sexual_orientations?: string[];
  pos_major?: unknown; // Position data
  signup_pos?: unknown; // Sign-up location
  client_metadata?: unknown;
  events?: unknown[];
  excluded_tags?: unknown[];
  image_tags?: unknown[];
  user_contents?: unknown[];
  user_message_consents?: unknown[];
  authIds?: unknown[];
}

interface Descriptor {
  // Known descriptor types found in real data (as of 2026-01):
  // Lifestyle: "Smoking", "Drinking", "Workout", "Dietary Preference", "Sleeping Habits", "Social Media"
  // Personal: "Zodiac", "Height", "Personality Type", "Education"
  // Languages: "Languages I Know"
  // Relationship: "Looking for", "Relationship Type", "Relationship Goals", "Love Style", "Communication Style", "Family Plans"
  // Pets: "Pets"
  // Legacy: "Basics" (appears in older exports, contains mixed data like zodiac, education, vaccination status, personality type, family plans)
  // Legacy: "Lifestyle" (appears in older exports, contains drinking/smoking data)
  name: string;

  // Example choices by category:
  // Smoking: "Non-smoker", "Trying to quit"
  // Drinking: "Socially on weekends", "Sober curious", "On special occasions"
  // Workout: "Everyday", "Often", "Never"
  // Dietary Preference: "Vegetarian", "Omnivore", "Other"
  // Sleeping Habits: "Early bird", "Night owl", "In a spectrum"
  // Social Media: "Socially active", "Passive scroller"
  // Zodiac: "Aries", "Leo", "Virgo", "Gemini", "Scorpio", "Capricorn", etc.
  // Height: "158 cm", "178 cm", "180 cm", "181 cm", "182 cm", "6' 2"", etc.
  // Personality Type: "ENTP", "ESFJ", "ISTP", "ENTJ", etc. (MBTI types)
  // Education: "High School", "In College", "Bachelors", "Masters"
  // Languages I Know: "English", "Spanish", "French", "German", "Norwegian", "Polish", "Persian", "Swedish", etc.
  // Looking for: "Long-term partner", "Long-term, open to short", "Short-term, open to long"
  // Relationship Type: "Monogamy"
  // Love Style: "Touch", "Time together", "Thoughtful gestures"
  // Communication Style: "Better in person"
  // Family Plans: "Not sure yet", "I want children"
  // Pets: "Cat", "Don't have but love"
  // Basics (legacy): Mixed values like "Scorpio", "Masters", "I want children", "Vaccinated", "ENTJ"
  choices: string[];

  visibility: string; // "public" - all observed descriptors have been public
}

export interface AnonymizedTinderUser extends TinderUserBase {
  instagram: boolean;
  spotify: boolean;
  country?: {
    code: string;
  };
}

interface FullTinderUser extends TinderUserBase {
  email: string;
  full_name: string;
  name: string;
  username: string;
  phone_id: string;
  instagram?: Instagram;
  spotify?: Spotify;
}
export type Experiences = Record<string, unknown>;
// export interface Experiences {
//   [key: string]: any;
//   // "Series Name": "Swipe Night",
//   // "Episode 1 Ending": "PHOBE"
//   // "EPISODE 1 Decisions": [
//   // "LIED TO TEX ABOUT BENJY"
//   // "LET BENJY JUMP ALONE"
//   // ]
//   // "Personalized Videos": [
//   // "Swipe Night: KILLER WEEKENS EPISODE 2"
//   // ]
// }

export interface RoomsAndInteractions {
  rooms: {
    role: null;
    is_active: boolean; // almost always true
    is_open: boolean; // almost always true
    room_type: "sync_swipe" | string;
    created_at: string; // not iso date, but close
    interactions: unknown[];
  }[];
}

interface StudentVerifications {
  entries: unknown[];
}

interface Campaigns {
  current_campaigns: unknown[];
  expired_campaigns: unknown[];
  // [{"event_name": "Free Tonight?", "campaign_name": "Free Tonight?"}, {"event_name": "Looking for love.", "campaign_name": "Looking for love."}]
}

interface Coords {
  lat: number;
  lon: number;
}

export interface City {
  name: string;
  region: string;
  coords?: Coords;
}

interface Photo {
  image: string;
  thumbnail: string;
  ts: string;
  link: string;
}

interface Instagram {
  completed_initial_fetch: boolean;
  last_fetch_time: Date;
  media_count: number;
  photos: Photo[];
  profile_picture: string;
  username: string;
}

interface Interest {
  // facebook interest
  id: string;
  created_time: Date;
  name: string;
}

interface Company {
  displayed: boolean;
  name: string;
}

interface Title {
  displayed: boolean;
  name: string;
}

interface Job {
  company?: Company;
  title?: Title;
}

interface Pos {
  at: string;
  lat: number;
  lon: number;
}

interface School {
  displayed: boolean;
  name: string;
}

interface AdministrativeAreaLevel1 {
  long_name: string;
  short_name: string;
}

interface AdministrativeAreaLevel2 {
  long_name: string;
  short_name: string;
}

interface Country {
  long_name: string;
  short_name: string;
}

interface Locality {
  long_name: string;
  short_name: string;
}

interface PostalCode {
  long_name: string;
  short_name: string;
}

interface Route {
  long_name: string;
  short_name: string;
}

interface StreetNumber {
  long_name: string;
  short_name: string;
}

interface TravelLocationInfo {
  administrative_area_level_1: AdministrativeAreaLevel1;
  administrative_area_level_2: AdministrativeAreaLevel2;
  country: Country;
  locality: Locality;
  postal_code: PostalCode;
  route: Route;
  street_number: StreetNumber;
  lat: number;
  lon: number;
}

interface TravelPos {
  lat: number;
  lon: number;
}

interface Pos2 {
  lat: number;
  lon: number;
}

interface Subscription {
  status: string;
  terms: number;
  product_type: string; // "plus"
  create_date: Date;
  expire_date: Date;
  platform: string; // "apple_store"
  pos: Pos2;
}

export interface Purchases {
  subscription: Subscription[];
  consumable: unknown[];
  boost_tracking: unknown[];
  super_like_tracking: unknown[];
}

interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  album: {
    id: string;
    name: string;
    images: {
      url: string;
      width: number;
      height: number;
    }[];
  };
  artists: {
    id: string;
    name: string;
  }[];
  preview_url: string;
  spotify_top_artists: {
    id: string;
    name: string;
    selected: boolean;
  }[];
}

export type Spotify =
  | {
      spotify_connected: boolean;
      // below is only present if spotify_connected is true
      spotify_username?: string;
      spotify_user_type?: "premium" | "free";
      spotify_theme_track?: SpotifyTrack;
      spotify_top_artists?: {
        id: string;
        name: string;
        top_track: SpotifyTrack;
        popularity: number;
      }[];
      spotify_last_updated_at?: string; // date
    }
  | Record<string, never>; // Empty object in newer exports

export interface Message {
  to: number; // match id - 1
  from: string; // "You"
  message?: string; // should maybe clean this from HTML to string. Lot's of "don&rsquo;t"
  sent_date: string; // not iso string, but close "Tue, 30 Nov 2021 05:08:21 GMT" // new Date() actually works well to parse it
  type?: // undefined = text
    | "gif"
    | "gesture"
    | "1" // actually a number / Int, but actually actually it's just a normal text
    | "activity"
    | "contact_card"
    | "swipe_note"
    | "game_notification"
    | "contextual"
    | "vibes"; // almost never occurs
  fixed_height?: string; // url (to gif)
}

export interface TinderJsonMatch {
  match_id: string;
  messages: Message[];
}

// Type guards to detect which format is being used
export function isNewPhotoFormat(
  photos: string[] | TinderPhoto[],
): photos is TinderPhoto[] {
  return (
    Array.isArray(photos) &&
    photos.length > 0 &&
    typeof photos[0] === "object" &&
    photos[0] !== null &&
    "id" in photos[0] &&
    "url" in photos[0]
  );
}

export function isOldPhotoFormat(
  photos: string[] | TinderPhoto[],
): photos is string[] {
  return (
    Array.isArray(photos) &&
    (photos.length === 0 || typeof photos[0] === "string")
  );
}
