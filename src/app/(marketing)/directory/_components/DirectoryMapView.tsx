"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import MapboxMap, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
} from "react-map-gl/mapbox";
import { MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { env } from "@/env";
import { getCountryCoordinates, addJitter } from "@/lib/country-coordinates";
import { AvatarMarker } from "./AvatarMarker";
import { DirectoryActivityFeed } from "./DirectoryActivityFeed";
import { DirectoryMapStats } from "./DirectoryMapStats";
import type { DirectoryProfile } from "@/lib/types/directory";
import type { DirectoryFilterOptions } from "@/lib/types/directory";

import "mapbox-gl/dist/mapbox-gl.css";

interface DirectoryMapViewProps {
  profiles: DirectoryProfile[];
  filterOptions?: DirectoryFilterOptions;
  totalCount?: number;
  focusProfileId?: string;
}

interface ProfileWithCoords extends DirectoryProfile {
  coordinates: { lat: number; lng: number };
}

export function DirectoryMapView({
  profiles,
  filterOptions: _filterOptions,
  totalCount,
  focusProfileId,
}: DirectoryMapViewProps) {
  const [hoveredProfile, setHoveredProfile] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const mapRef = useRef<MapRef>(null);

  // Geocode profiles and add jitter
  const profilesWithCoords = useMemo(() => {
    const countryIndexMap = new Map<string, number>();

    return profiles
      .map((profile) => {
        // Use user.country if available, fallback to profile.country
        const country = profile.userCountry || profile.country;
        if (!country) return null;

        const coords = getCountryCoordinates(country);
        if (!coords) return null;

        // Track index per country for jitter
        const countryKey = country.toLowerCase();
        const index = countryIndexMap.get(countryKey) ?? 0;
        countryIndexMap.set(countryKey, index + 1);

        const jitteredCoords = addJitter(coords, index, 0.5);

        return {
          ...profile,
          coordinates: jitteredCoords,
        } as ProfileWithCoords;
      })
      .filter((profile): profile is ProfileWithCoords => profile !== null);
  }, [profiles]);

  // Calculate initial view state
  const initialViewState = useMemo(() => {
    if (profilesWithCoords.length === 0) {
      return {
        longitude: 0,
        latitude: 20,
        zoom: 1.5,
      };
    }

    // Calculate bounds
    const lats = profilesWithCoords.map((p) => p.coordinates.lat);
    const lngs = profilesWithCoords.map((p) => p.coordinates.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calculate zoom based on bounds
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    let zoom = 1.5;
    if (maxDiff < 10) zoom = 4;
    else if (maxDiff < 30) zoom = 2.5;
    else if (maxDiff < 60) zoom = 1.5;

    return {
      longitude: centerLng,
      latitude: centerLat,
      zoom,
    };
  }, [profilesWithCoords]);

  const selectedProfileData = useMemo(() => {
    if (!selectedProfile) return null;
    return profilesWithCoords.find((p) => p.id === selectedProfile);
  }, [selectedProfile, profilesWithCoords]);

  // Handle focusing on a specific profile
  useEffect(() => {
    if (!focusProfileId || !mapRef.current) return;

    const focusProfile = profilesWithCoords.find(
      (p) => p.id === focusProfileId,
    );
    if (!focusProfile) return;

    // Zoom to the profile
    mapRef.current.flyTo({
      center: [focusProfile.coordinates.lng, focusProfile.coordinates.lat],
      zoom: 8,
      duration: 2000,
    });

    // Select the profile after a brief delay to allow map to start moving
    setTimeout(() => {
      setSelectedProfile(focusProfileId);
    }, 500);
  }, [focusProfileId, profilesWithCoords]);

  const profileHref = (profile: DirectoryProfile) =>
    profile.platform === "tinder"
      ? `/insights/tinder/${profile.id}`
      : `/insights/hinge/${profile.id}`;

  const formatMatchRate = (rate: number | null) =>
    rate ? `${(rate * 100).toFixed(1)}%` : "N/A";

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  const formatDays = (days: number | null) => {
    if (!days) return null;
    if (days < 30) return `${days} days`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? "s" : ""}`;
    }
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (months > 0) {
      return `${years} year${years > 1 ? "s" : ""}, ${months} month${months > 1 ? "s" : ""}`;
    }
    return `${years} year${years > 1 ? "s" : ""}`;
  };

  if (profilesWithCoords.length === 0) {
    return (
      <div className="bg-muted/30 flex h-[60vh] items-center justify-center rounded-lg border">
        <div className="text-center">
          <MapPin className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-sm font-medium">
            No profiles with location data
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Profiles will appear on the map once country information is
            available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 h-[calc(100vh-300px)] min-h-[500px] w-full overflow-hidden rounded-lg border sm:h-[calc(100vh-250px)]">
      <MapboxMap
        ref={mapRef}
        mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_PUBLIC_API_KEY}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        projection="globe"
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" />

        {/* Profile Markers */}
        {profilesWithCoords.map((profile) => (
          <Marker
            key={profile.id}
            longitude={profile.coordinates.lng}
            latitude={profile.coordinates.lat}
            anchor="bottom"
          >
            <button
              className="transition-transform hover:scale-110 focus:outline-none"
              onMouseEnter={() => setHoveredProfile(profile.id)}
              onMouseLeave={() => setHoveredProfile(null)}
              onClick={() =>
                setSelectedProfile(
                  selectedProfile === profile.id ? null : profile.id,
                )
              }
            >
              <AvatarMarker
                profile={profile}
                isHovered={hoveredProfile === profile.id}
              />
            </button>
          </Marker>
        ))}

        {/* Popup for selected profile */}
        {selectedProfileData && (
          <Popup
            longitude={selectedProfileData.coordinates.lng}
            latitude={selectedProfileData.coordinates.lat}
            anchor="bottom"
            onClose={() => setSelectedProfile(null)}
            closeButton={true}
            closeOnClick={false}
            className="mapboxgl-popup-content"
          >
            <div className="w-64 space-y-3 p-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {selectedProfileData.gender},{" "}
                    {selectedProfileData.ageAtUpload}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      selectedProfileData.platform === "tinder"
                        ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    }`}
                  >
                    {selectedProfileData.platform === "tinder"
                      ? "Tinder"
                      : "Hinge"}
                  </span>
                </div>
                {(selectedProfileData.userCountry ||
                  selectedProfileData.country) && (
                  <p className="text-muted-foreground text-sm">
                    {selectedProfileData.userCity
                      ? `${selectedProfileData.userCity}, `
                      : ""}
                    {selectedProfileData.userCountry ||
                      selectedProfileData.country}
                  </p>
                )}
                {selectedProfileData.createdAt && (
                  <p className="text-muted-foreground text-xs">
                    Uploaded {formatTimeAgo(selectedProfileData.createdAt)}
                  </p>
                )}
                {selectedProfileData.daysInPeriod && (
                  <div className="bg-muted/50 mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5">
                    <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                    <span className="text-xs">
                      <span className="text-foreground font-medium">
                        {formatDays(selectedProfileData.daysInPeriod)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        on{" "}
                        {selectedProfileData.platform === "tinder"
                          ? "Tinder"
                          : "Hinge"}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 border-t pt-2">
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {selectedProfileData.matchesTotal ?? 0}
                  </div>
                  <div className="text-muted-foreground text-xs">Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {selectedProfileData.swipeLikesTotal ?? 0}
                  </div>
                  <div className="text-muted-foreground text-xs">Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {formatMatchRate(selectedProfileData.matchRate)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Match Rate
                  </div>
                </div>
              </div>

              <Link
                href={profileHref(selectedProfileData)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold transition-colors"
              >
                View Profile
              </Link>
            </div>
          </Popup>
        )}
      </MapboxMap>

      {/* Activity Feed */}
      <DirectoryActivityFeed profiles={profiles} />

      {/* Stats Overlay */}
      <DirectoryMapStats profiles={profiles} totalCount={totalCount} />
    </div>
  );
}
