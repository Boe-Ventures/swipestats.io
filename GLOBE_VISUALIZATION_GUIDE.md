# Globe Visualization — Porting Guide

A self-contained spec for re-implementing the SwipeStats interactive **globe map** (the
`/directory` page) in a different domain/codebase. It uses **Mapbox GL** in `globe`
projection, with custom HTML markers, a popup, an activity feed, and a stats overlay.

Source of truth (SwipeStats): `src/app/(marketing)/directory/`

---

## 1. What it is

A full-bleed dark 3D globe with one avatar marker per record, positioned by **country**
(not exact lat/lng). Markers from the same country are deterministically "jittered" so they
don't stack. Hovering scales a marker; clicking opens a popup with details + a link. Two
floating panels sit on top of the map: a **Recent Activity** feed (top-left) and a **Map
Statistics** overlay (top-right).

The globe itself is just Mapbox with `projection="globe"` + `mapStyle="…/dark-v11"`.
Everything else (markers, popups, panels) is your own React on top.

---

## 2. Dependencies

```jsonc
// package.json
"mapbox-gl": "^3.17.0",     // the GL engine + CSS
"react-map-gl": "^8.1.0",   // React wrapper (import from "react-map-gl/mapbox")
"date-fns": "^4.1.0",       // formatDistanceToNow for "uploaded 3 days ago"
"lucide-react": "*"         // icons (MapPin, Calendar, Globe, Flame, Heart, etc.)
```

Install: `bun add mapbox-gl react-map-gl date-fns lucide-react`

> `react-map-gl` v8 splits entry points. Import map components from
> **`react-map-gl/mapbox`**, not the package root. Also `import "mapbox-gl/dist/mapbox-gl.css"`
> once in the map component.

---

## 3. Required config / secrets

A Mapbox **public** access token (starts with `pk.`). In SwipeStats it's a validated env var:

```ts
// env.ts (client-exposed, must be NEXT_PUBLIC_*)
NEXT_PUBLIC_MAPBOX_PUBLIC_API_KEY: z.string()
```

Get one free at https://account.mapbox.com/access-tokens/. The free tier covers ~50k map
loads/month. Pass it as `mapboxAccessToken={...}` on the `<Map>`.

---

## 4. Data contract

The globe only needs an array of records shaped roughly like this. Adapt field names to
your domain — the **only hard requirement is a country (or any geocodable location) string
and a stable `id`.**

```ts
type GlobeRecord = {
  id: string;
  // location — at least one geocodable field
  country: string | null;
  city: string | null;
  // anything you want to show in marker/popup/feed:
  createdAt: Date;
  category: "tinder" | "hinge";  // drives marker badge + color in our case
  label: string;                 // e.g. "Male, 28"
  // ...domain stats shown in popup/feed (matches, rate, etc.)
};
```

In SwipeStats this is `DirectoryProfile` (`src/lib/types/directory.ts`). The server (a tRPC
`directory.list` query backed by Drizzle/Postgres) returns ~21–100 records ordered newest-
first. **Nothing about the globe requires tRPC or Postgres** — any fetch that yields the array
works. Keep the list small (tens, low hundreds) since each marker is a real DOM node.

---

## 5. The 4 pieces of geo logic (the only non-obvious part)

These live in `src/lib/country-coordinates.ts` and are fully portable (copy as-is).

1. **Country → coordinates table** — a hardcoded `Record<string, {lat,lng}>` of ~100
   countries mapped to their approximate centers. This is what avoids needing a geocoding
   API. Extend/replace with your own location set if you key off something other than
   countries (cities, regions, etc.).

2. **`getCountryCoordinates(country)`** — fuzzy lookup: exact match → normalized match
   (lowercase, strip punctuation) → partial/substring match → `null`. Returns `null` for
   unknown locations so the record is dropped from the map.

3. **`addJitter(coords, index, maxJitter = 0.5)`** — spreads same-country markers apart
   **deterministically** (uses the golden angle `137.508°` seeded by a per-country index, so
   no `Math.random()` → stable across renders/SSR). Without this, every US profile lands on
   the exact same point.

4. The component tracks a `Map<countryKey, runningIndex>` while geocoding so each record in a
   country gets the next jitter index.

```ts
// usage inside the map component
const countryIndexMap = new Map<string, number>();
const withCoords = records.map((r) => {
  const country = r.userCountry || r.country;
  const coords = getCountryCoordinates(country);
  if (!coords) return null;                      // drop un-geocodable
  const i = countryIndexMap.get(country.toLowerCase()) ?? 0;
  countryIndexMap.set(country.toLowerCase(), i + 1);
  return { ...r, coordinates: addJitter(coords, i, 0.5) };
}).filter(Boolean);
```

---

## 6. Component architecture

```
page.tsx                       Route: fetches records, renders <GlobeMapView>
└─ GlobeMapView (client)       The map. Owns hover/selected state + geocoding.
   ├─ <Map projection="globe"> from react-map-gl/mapbox
   │   ├─ <NavigationControl/>             zoom/compass buttons
   │   ├─ <Marker> × N  → <AvatarMarker>   one per geocoded record
   │   └─ <Popup>                          shown for the selected record
   ├─ <ActivityFeed/>          floating top-left panel (recent records)
   └─ <MapStats/>              floating top-right panel (aggregates)
```

Supporting (optional): `MapViewToggle` (List ⇄ Map switch via a shadcn `Switch`).

### 6a. GlobeMapView — the core (`DirectoryMapView.tsx`)

Key responsibilities and the patterns used:

- **`"use client"`** — Mapbox is browser-only.
- Geocode + jitter records in a `useMemo` keyed on the records array (section 5).
- **`initialViewState`** computed from the bounding box of all points: center =
  midpoint of min/max lat/lng; zoom chosen by the largest span (`<10°→4`, `<30°→2.5`,
  else `1.5`). Empty → `{longitude:0, latitude:20, zoom:1.5}`.
- State: `hoveredProfile: string|null`, `selectedProfile: string|null`, `mapRef` (`MapRef`).
- **`<Map>` props that make it a globe:**
  ```tsx
  <Map
    ref={mapRef}
    mapboxAccessToken={TOKEN}
    initialViewState={initialViewState}
    style={{ width: "100%", height: "100%" }}
    mapStyle="mapbox://styles/mapbox/dark-v11"
    projection="globe"            // ← this is the globe
  >
  ```
- Each record → `<Marker longitude lat anchor="bottom">` wrapping a `<button>` that sets
  hover on enter/leave and toggles `selectedProfile` on click, rendering `<AvatarMarker>`.
- `<Popup>` rendered when a record is selected (`anchor="bottom"`, `closeOnClick={false}`),
  containing the detail card + a `<Link>` to the record's page.
- **Fly-to / deep-link focus:** accept an optional `focusProfileId`; in a `useEffect` call
  `mapRef.current.flyTo({ center:[lng,lat], zoom:8, duration:2000 })` then select it after
  ~500ms. Lets you link straight to one pin.
- **Empty state:** if zero records geocode, render a centered "No location data" panel
  instead of the map.
- Container sizing: `relative h-[calc(100vh-300px)] min-h-[500px] w-full overflow-hidden
  rounded-lg border`. The map fills it via `style={{width:"100%",height:"100%"}}`.

### 6b. AvatarMarker (`AvatarMarker.tsx`)

Pure presentational pin. A 40px rounded circle, colored by a category field (in our case
gender → blue/pink/purple/gray), with a generic person SVG, a small platform badge
(Flame/Heart) bottom-right, and effects on hover: `scale-125`, a colored ring, and an
`animate-ping` pulse. Props: `{ record, isHovered?, isFiltered? }`. No Mapbox dependency —
reusable in the activity feed too.

### 6c. ActivityFeed (`DirectoryActivityFeed.tsx`)

Absolutely-positioned panel: `absolute top-4 left-4 z-10 hidden lg:block w-64`,
`bg-background/95 backdrop-blur-sm`, scrollable. Sorts records by `createdAt` desc, takes
top ~15, each a `<Link>` row with an `AvatarMarker`, label, location, stats, and
`formatDistanceToNow(createdAt)`. Staggered entrance via
`style={{ animationDelay: \`${i*50}ms\` }}` + `animate-in fade-in slide-in-from-left-2`.

### 6d. MapStats (`DirectoryMapStats.tsx`)

Absolutely-positioned panel `absolute top-4 right-4 z-10 w-64`. Collapsible. Computes
aggregates in a `useMemo` over records: top countries, category distribution, gender split,
averages, totals. In SwipeStats the richer aggregates are gated behind a subscription tier
(`useSubscription`) with a blurred preview + upgrade CTA for free users — **drop this gating
entirely** unless your domain has tiers.

### 6e. MapViewToggle (`MapViewToggle.tsx`) — optional

A shadcn `<Switch>` between `"list"` and `"map"`. The current SwipeStats page actually
shows map **and** grid stacked (no toggle), so this is optional.

---

## 7. Styling notes

- Tailwind throughout; uses shadcn/ui design tokens (`bg-background`, `text-muted-
  foreground`, `border`, `bg-primary`…). If your target lacks shadcn, swap for literal
  colors.
- `mapStyle="mapbox://styles/mapbox/dark-v11"` gives the dark globe. Swap for `light-v11`,
  `satellite-v9`, or a custom Studio style.
- Mapbox's default popup chrome is restyled via the `mapboxgl-popup-content` class.
- Floating panels rely on `backdrop-blur-sm` + `/95` bg opacity to sit legibly over the map.

---

## 8. Files to copy / adapt

| File | Portability |
|------|-------------|
| `lib/country-coordinates.ts` | **Copy as-is** (extend the table). The reusable core. |
| `_components/AvatarMarker.tsx` | Copy; re-map category→color + badge to your domain. |
| `_components/DirectoryMapView.tsx` | Copy as skeleton; rewrite popup body + field names. |
| `_components/DirectoryActivityFeed.tsx` | Copy; rewrite the row content. |
| `_components/DirectoryMapStats.tsx` | Copy; **delete subscription gating**; redefine aggregates. |
| `_components/MapViewToggle.tsx` | Optional. |
| `lib/types/directory.ts` | Replace with your own record type. |
| `directoryRouter.ts` / page fetch | Domain-specific; just return `GlobeRecord[]`. |

---

## 9. Minimal implementation checklist

1. `bun add mapbox-gl react-map-gl date-fns lucide-react`
2. Add `NEXT_PUBLIC_MAPBOX_PUBLIC_API_KEY` (a `pk.` token) to env + validation.
3. Copy `country-coordinates.ts`; extend the table to cover your locations.
4. Define your `GlobeRecord` type and a fetch that returns `GlobeRecord[]`.
5. Build `GlobeMapView` (`"use client"`): geocode+jitter → `<Map projection="globe" …>` →
   `<Marker>`s → `<Popup>`. Remember `import "mapbox-gl/dist/mapbox-gl.css"`.
6. Add `AvatarMarker`; map your category to colors/badges.
7. (Optional) Add `ActivityFeed` + `MapStats` floating panels.
8. (Optional) Accept a `focusId` prop and `flyTo` it for deep-linkable pins.

## 10. Gotchas

- **Browser-only:** every map component needs `"use client"`; never render `<Map>` on the
  server. In Next App Router, lazy-load or keep it under a client boundary.
- **Token must be public** (`pk.`) and `NEXT_PUBLIC_` — it ships to the browser. Restrict it
  by URL in the Mapbox dashboard rather than hiding it.
- **Don't use `Math.random()` for jitter** — it breaks SSR hydration and reshuffles pins each
  render. The golden-angle deterministic jitter is deliberate.
- **Marker count = DOM nodes.** Hundreds is fine; thousands will jank. For large sets switch
  to Mapbox's `Source`/`Layer` with clustering (GeoJSON circle layers) instead of React
  `<Marker>`s.
- Import map pieces from `react-map-gl/mapbox`, not `react-map-gl` root (v8 change).
- The CSS import (`mapbox-gl/dist/mapbox-gl.css`) is required or controls/popups render
  unstyled.
