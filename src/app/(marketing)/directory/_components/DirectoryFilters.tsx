"use client";

import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsStringEnum,
} from "nuqs";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/components/ui/hooks/use-media-query";
import { PremiumFeatureWrapper } from "@/components/premium/PremiumFeatureWrapper";
import type { DirectoryFilterOptions } from "@/lib/types/directory";

interface DirectoryFiltersProps {
  filterOptions?: DirectoryFilterOptions;
  activeFilterCount: number;
}

export function DirectoryFilters({
  filterOptions,
  activeFilterCount,
}: DirectoryFiltersProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [
    {
      platform,
      gender,
      ageMin,
      ageMax,
      matchRateMin,
      matchRateMax,
      country,
      sortBy,
    },
    setFilters,
  ] = useQueryStates({
    platform: parseAsStringEnum(["tinder", "hinge"]),
    gender: parseAsStringEnum(["MALE", "FEMALE", "OTHER", "MORE"]),
    ageMin: parseAsInteger,
    ageMax: parseAsInteger,
    matchRateMin: parseAsString,
    matchRateMax: parseAsString,
    country: parseAsString,
    sortBy: parseAsStringEnum([
      "newest",
      "most_matches",
      "highest_match_rate",
    ]).withDefault("newest"),
  });

  const hasActiveFilters =
    platform != null ||
    gender != null ||
    ageMin != null ||
    ageMax != null ||
    matchRateMin != null ||
    matchRateMax != null ||
    country != null ||
    sortBy !== "newest";

  const clearFilters = () => {
    void setFilters({
      platform: null,
      gender: null,
      ageMin: null,
      ageMax: null,
      matchRateMin: null,
      matchRateMax: null,
      country: null,
      sortBy: "newest",
    });
  };

  const platformOptions = [
    { value: "tinder", label: "Tinder" },
    { value: "hinge", label: "Hinge" },
  ];

  const genderOptions = filterOptions?.genders.map((g) => ({
    value: g.value,
    label: `${g.label} (${g.count})`,
  })) ?? [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
    { value: "MORE", label: "More" },
  ];

  const matchRateOptions = [
    { value: "0.2", label: "High (>20%)" },
    { value: "0.1", label: "Medium (10-20%)" },
    { value: "0", label: "Low (<10%)" },
  ];

  const countryOptions =
    filterOptions?.countries.map((c) => ({
      value: c.value,
      label: `${c.label} (${c.count})`,
    })) ?? [];

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "most_matches", label: "Most Matches" },
    { value: "highest_match_rate", label: "Highest Match Rate" },
  ];

  const handleMatchRateChange = (type: "min" | "max", value: string) => {
    if (type === "min") {
      if (value === "all") {
        void setFilters({ matchRateMin: null });
      } else {
        const minValue =
          value === "0.2" ? "0.2" : value === "0.1" ? "0.1" : "0";
        void setFilters({
          matchRateMin: minValue === "0" ? null : minValue,
          matchRateMax: minValue === "0.2" ? null : matchRateMax,
        });
      }
    } else {
      void setFilters({ matchRateMax: value === "all" ? null : value });
    }
  };

  const filterContent = (
    <div className="space-y-4">
      {/* Platform Filter */}
      <div className="space-y-2">
        <label className="text-muted-foreground text-sm font-medium">
          Platform
        </label>
        <div className="flex gap-2">
          <Button
            variant={platform == null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ platform: null })}
            className={
              platform == null ? "bg-primary text-primary-foreground" : ""
            }
          >
            All
          </Button>
          {platformOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={platform === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setFilters({
                  platform: opt.value as "tinder" | "hinge",
                })
              }
              className={
                platform === opt.value
                  ? "bg-primary text-primary-foreground"
                  : ""
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Gender Filter */}
      <div className="space-y-2">
        <label className="text-muted-foreground text-sm font-medium">
          Gender
        </label>
        <SimpleSelect
          value={gender ?? "all"}
          onValueChange={(value) =>
            setFilters({
              gender:
                value === "all"
                  ? null
                  : (value as "MALE" | "FEMALE" | "OTHER" | "MORE"),
            })
          }
          placeholder="All Genders"
          options={[{ value: "all", label: "All Genders" }, ...genderOptions]}
        />
      </div>

      {/* Age Range */}
      <div className="space-y-2">
        <label className="text-muted-foreground text-sm font-medium">
          Age Range
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            min={filterOptions?.ageRange.min ?? 18}
            max={filterOptions?.ageRange.max ?? 100}
            value={ageMin ?? ""}
            onChange={(e) =>
              setFilters({
                ageMin:
                  e.target.value === "" ? null : parseInt(e.target.value, 10),
              })
            }
            className="w-24"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="Max"
            min={filterOptions?.ageRange.min ?? 18}
            max={filterOptions?.ageRange.max ?? 100}
            value={ageMax ?? ""}
            onChange={(e) =>
              setFilters({
                ageMax:
                  e.target.value === "" ? null : parseInt(e.target.value, 10),
              })
            }
            className="w-24"
          />
        </div>
      </div>

      {/* Match Rate Filter */}
      <div className="space-y-2">
        <label className="text-muted-foreground text-sm font-medium">
          Match Rate
        </label>
        <SimpleSelect
          value={
            matchRateMin === "0.2"
              ? "0.2"
              : matchRateMin === "0.1"
                ? "0.1"
                : matchRateMin === "0"
                  ? "0"
                  : "all"
          }
          onValueChange={(value) => handleMatchRateChange("min", value)}
          placeholder="All Match Rates"
          options={[
            { value: "all", label: "All Match Rates" },
            ...matchRateOptions,
          ]}
        />
      </div>

      {/* Country Filter */}
      {countryOptions.length > 0 && (
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-medium">
            Country
          </label>
          <SimpleSelect
            value={country ?? "all"}
            onValueChange={(value) =>
              setFilters({ country: value === "all" ? null : value })
            }
            placeholder="All Countries"
            options={[
              { value: "all", label: "All Countries" },
              ...countryOptions,
            ]}
          />
        </div>
      )}

      {/* Sort */}
      <div className="space-y-2">
        <label className="text-muted-foreground text-sm font-medium">
          Sort By
        </label>
        <SimpleSelect
          value={sortBy ?? "newest"}
          onValueChange={(value) =>
            setFilters({
              sortBy: value as "newest" | "most_matches" | "highest_match_rate",
            })
          }
          options={sortOptions}
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="mr-2 h-4 w-4" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="relative">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <PremiumFeatureWrapper
              requiredTier="PLUS"
              upgradeTitle="Unlock Advanced Filters"
              upgradeDescription="Filter profiles by platform, gender, age, match rate & location"
              lockedContent={
                <div className="pointer-events-none opacity-40 blur-sm">
                  {filterContent}
                </div>
              }
            >
              {filterContent}
            </PremiumFeatureWrapper>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <PremiumFeatureWrapper
      requiredTier="PLUS"
      upgradeTitle="Unlock Advanced Filters"
      upgradeDescription="Filter profiles by platform, gender, age, match rate & location"
      className="block"
      lockedContent={
        <div className="bg-muted/30 rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-end">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
          <div className="pointer-events-none grid grid-cols-1 gap-4 opacity-40 blur-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {/* Platform */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">
                Platform
              </label>
              <div className="flex gap-1">
                <Button
                  variant={platform == null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ platform: null })}
                  className={
                    platform == null
                      ? "bg-primary text-primary-foreground text-xs"
                      : "text-xs"
                  }
                >
                  All
                </Button>
                {platformOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={platform === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFilters({
                        platform: opt.value as "tinder" | "hinge",
                      })
                    }
                    className={
                      platform === opt.value
                        ? "bg-primary text-primary-foreground text-xs"
                        : "text-xs"
                    }
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">
                Gender
              </label>
              <SimpleSelect
                value={gender ?? "all"}
                onValueChange={(value) =>
                  setFilters({
                    gender:
                      value === "all"
                        ? null
                        : (value as "MALE" | "FEMALE" | "OTHER" | "MORE"),
                  })
                }
                placeholder="All"
                options={[{ value: "all", label: "All" }, ...genderOptions]}
                size="sm"
              />
            </div>

            {/* Age Range */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">
                Age
              </label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  placeholder="Min"
                  min={filterOptions?.ageRange.min ?? 18}
                  max={filterOptions?.ageRange.max ?? 100}
                  value={ageMin ?? ""}
                  onChange={(e) =>
                    setFilters({
                      ageMin:
                        e.target.value === ""
                          ? null
                          : parseInt(e.target.value, 10),
                    })
                  }
                  className="h-8 w-16 text-xs"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  min={filterOptions?.ageRange.min ?? 18}
                  max={filterOptions?.ageRange.max ?? 100}
                  value={ageMax ?? ""}
                  onChange={(e) =>
                    setFilters({
                      ageMax:
                        e.target.value === ""
                          ? null
                          : parseInt(e.target.value, 10),
                    })
                  }
                  className="h-8 w-16 text-xs"
                />
              </div>
            </div>

            {/* Match Rate */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">
                Match Rate
              </label>
              <SimpleSelect
                value={
                  matchRateMin === "0.2"
                    ? "0.2"
                    : matchRateMin === "0.1"
                      ? "0.1"
                      : matchRateMin === "0"
                        ? "0"
                        : "all"
                }
                onValueChange={(value) => handleMatchRateChange("min", value)}
                placeholder="All"
                options={[{ value: "all", label: "All" }, ...matchRateOptions]}
                size="sm"
              />
            </div>

            {/* Country */}
            {countryOptions.length > 0 && (
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium">
                  Country
                </label>
                <SimpleSelect
                  value={country ?? "all"}
                  onValueChange={(value) =>
                    setFilters({ country: value === "all" ? null : value })
                  }
                  placeholder="All"
                  options={[{ value: "all", label: "All" }, ...countryOptions]}
                  size="sm"
                />
              </div>
            )}

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">
                Sort
              </label>
              <SimpleSelect
                value={sortBy ?? "newest"}
                onValueChange={(value) =>
                  setFilters({
                    sortBy: value as
                      | "newest"
                      | "most_matches"
                      | "highest_match_rate",
                  })
                }
                options={sortOptions}
                size="sm"
              />
            </div>
          </div>
        </div>
      }
    >
      <div className="bg-muted/30 rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-end">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {/* Platform */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium">
              Platform
            </label>
            <div className="flex gap-1">
              <Button
                variant={platform == null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters({ platform: null })}
                className={
                  platform == null
                    ? "bg-primary text-primary-foreground text-xs"
                    : "text-xs"
                }
              >
                All
              </Button>
              {platformOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={platform === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setFilters({
                      platform: opt.value as "tinder" | "hinge",
                    })
                  }
                  className={
                    platform === opt.value
                      ? "bg-primary text-primary-foreground text-xs"
                      : "text-xs"
                  }
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium">
              Gender
            </label>
            <SimpleSelect
              value={gender ?? "all"}
              onValueChange={(value) =>
                setFilters({
                  gender:
                    value === "all"
                      ? null
                      : (value as "MALE" | "FEMALE" | "OTHER" | "MORE"),
                })
              }
              placeholder="All"
              options={[{ value: "all", label: "All" }, ...genderOptions]}
              size="sm"
            />
          </div>

          {/* Age Range */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium">
              Age
            </label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="Min"
                min={filterOptions?.ageRange.min ?? 18}
                max={filterOptions?.ageRange.max ?? 100}
                value={ageMin ?? ""}
                onChange={(e) =>
                  setFilters({
                    ageMin:
                      e.target.value === ""
                        ? null
                        : parseInt(e.target.value, 10),
                  })
                }
                className="h-8 w-16 text-xs"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="number"
                placeholder="Max"
                min={filterOptions?.ageRange.min ?? 18}
                max={filterOptions?.ageRange.max ?? 100}
                value={ageMax ?? ""}
                onChange={(e) =>
                  setFilters({
                    ageMax:
                      e.target.value === ""
                        ? null
                        : parseInt(e.target.value, 10),
                  })
                }
                className="h-8 w-16 text-xs"
              />
            </div>
          </div>

          {/* Match Rate */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium">
              Match Rate
            </label>
            <SimpleSelect
              value={
                matchRateMin === "0.2"
                  ? "0.2"
                  : matchRateMin === "0.1"
                    ? "0.1"
                    : matchRateMin === "0"
                      ? "0"
                      : "all"
              }
              onValueChange={(value) => handleMatchRateChange("min", value)}
              placeholder="All"
              options={[{ value: "all", label: "All" }, ...matchRateOptions]}
              size="sm"
            />
          </div>

          {/* Country */}
          {countryOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">
                Country
              </label>
              <SimpleSelect
                value={country ?? "all"}
                onValueChange={(value) =>
                  setFilters({ country: value === "all" ? null : value })
                }
                placeholder="All"
                options={[{ value: "all", label: "All" }, ...countryOptions]}
                size="sm"
              />
            </div>
          )}

          {/* Sort */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium">
              Sort
            </label>
            <SimpleSelect
              value={sortBy ?? "newest"}
              onValueChange={(value) =>
                setFilters({
                  sortBy: value as
                    | "newest"
                    | "most_matches"
                    | "highest_match_rate",
                })
              }
              options={sortOptions}
              size="sm"
            />
          </div>
        </div>
      </div>
    </PremiumFeatureWrapper>
  );
}
