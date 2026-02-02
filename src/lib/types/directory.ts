export type DirectoryProfile = {
  id: string;
  platform: "tinder" | "hinge";
  ageAtUpload: number;
  gender: string;
  city: string | null;
  country: string | null;
  createdAt: Date;
  // Stats from ProfileMeta (simplified)
  matchesTotal: number | null;
  swipeLikesTotal: number | null;
  swipePassesTotal: number | null;
  matchRate: number | null;
  daysInPeriod: number | null;
  // User location (from user table)
  userCity: string | null;
  userCountry: string | null;
};

export type DirectoryStats = {
  matchesTotal: number;
  swipeLikesTotal: number;
  swipePassesTotal: number;
  matchRate: number;
};

export type DirectoryFilters = {
  platform?: "tinder" | "hinge";
  gender?: string;
  ageMin?: number;
  ageMax?: number;
  matchRateMin?: number;
  matchRateMax?: number;
  country?: string;
  sortBy?: "newest" | "most_matches" | "highest_match_rate";
};

export interface DirectoryFilterOptions {
  countries: Array<{ value: string; label: string; count: number }>;
  genders: Array<{ value: string; label: string; count: number }>;
  ageRange: { min: number; max: number };
  matchRateRange: { min: number; max: number };
}

export type DirectoryPagination = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
