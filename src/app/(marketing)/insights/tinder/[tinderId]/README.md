# Tinder Insights Page

## Architecture

This page follows a **Server + Client Provider** pattern:

### Server Component (`page.tsx`)
- Fetches basic `TinderProfile` (without usage data) for fast initial render
- Shows 404 if profile doesn't exist
- Passes profile to `InsightsProvider`

### Client Provider (`InsightsProvider.tsx`)
- Manages comparison state via URL query params (`?compare=id1,id2`)
- Fetches full usage data for main profile + all comparison profiles
- Provides context with:
  - `myTinderId` - the primary profile ID
  - `myTinderProfile` - basic profile info (from server)
  - `profiles` - array of profiles with usage data (main + comparisons)
  - `loading` - loading state
  - `addComparisonId(id)` - add a comparison profile
  - `removeComparisonId(id)` - remove a comparison profile
  - `comparisonIds` - array of comparison IDs in URL

### Data Flow

```
1. Server fetches basic profile → fast initial render
2. Client provider fetches usage data for [mainId, ...comparisonIds]
3. Shows loading skeleton while fetching
4. Children components use useInsights() hook to access data
```

## Usage in Components

```tsx
import { useInsights } from "./InsightsProvider";

function MyComponent() {
  const { profiles, myTinderId, addComparisonId } = useInsights();
  
  const myProfile = profiles.find(p => p.tinderId === myTinderId);
  const comparisons = profiles.filter(p => p.tinderId !== myTinderId);
  
  // ... render charts/stats
}
```

## Data Types

See `@/lib/types/profile.ts` for:
- `TinderProfileWithUsage` - profile with usage array and profileMeta array
- Helper functions: `getGlobalMeta()`, `getMonthlyMetas()`, `getYearlyMetas()`

## API Endpoints

### `profile.get`
- Input: `{ tinderId: string }`
- Returns: Basic `TinderProfile` (no relations)
- Used by server component for fast initial fetch

### `profile.getWithUsage`
- Input: `{ tinderIds: string[] }`
- Returns: Array of profiles with `usage` and `profileMeta` relations
- Used by client provider for full data
- Note: Returns ALL usage data (not filtered by date range)

## Future Considerations

- Consider adding a dedicated `/compare` page for side-by-side comparison UI
- May want to add pagination/infinite scroll for usage data if datasets get huge
- Could add caching/optimistic updates for comparison ID management

