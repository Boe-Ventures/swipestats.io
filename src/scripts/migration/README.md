# SwipeStats V4 Migration Guide

Complete guide for migrating from Prisma/Neon (old) to Drizzle/Neon (new) database.

## Quick Start

```bash
# Step 1: Reset schema (one-time, drops all tables)
bun run src/scripts/migration/reset-schema.ts

# Step 2: Run full migration pipeline
OLD_DATABASE_URL=<old> DATABASE_URL=<new> bun run src/scripts/migration/run.ts

# Or if you already have migrated data and only need statistics:
DATABASE_URL=<db> bun run src/scripts/migration/run.ts --stats-only
```

## Pre-Migration Checklist

- [ ] Both database connection strings ready
- [ ] OLD database accessible (read-only is fine)
- [ ] NEW database accessible (needs write permissions)
- [ ] ~1 hour available for full migration (7k profiles)
- [ ] `.env` file configured with database URLs

## Environment Setup

Create a `.env` file in the project root:

```bash
OLD_DATABASE_URL=postgresql://user:pass@old-host/database
DATABASE_URL=postgresql://user:pass@new-host/database
```

Optional variables:
- `PROFILE_LIMIT=N` - Limit number of profiles (default: all)
- `DRY_RUN=true` - Preview without writing
- `FORCE=true` - Force recompute ProfileMeta

## What Gets Migrated

### Included Data

- **Users** - Synthetic anonymous users (preserves FK relationships)
- **TinderProfiles** - Profile information
- **TinderUsage** - Raw daily usage data
- **Matches** - Match records
- **Messages** - Message history
- **Media** - Profile media
- **Jobs** - Employment data
- **Schools** - Education data

### Intentionally Skipped

- **OriginalAnonymizedFiles** - HTTP 64MB response limit
  - Users can re-upload JSON if needed
  - All structured data migrated, no insight loss
  
- **ProfileMeta** - Old schema incompatible
  - Recomputed fresh with new schema
  - New fields: per-active-day metrics, proper filtering
  - Excludes `dateIsMissingFromOriginalData` days

## Migration Pipeline

The `run-migration.ts` script orchestrates these steps:

### Step 1: Core Data Migration (10-15 min)

Migrates raw data from old to new database:

```bash
# Runs automatically, or manually:
bun run src/scripts/migration/steps/migrate-data.ts
```

Features:
- Batched queries to avoid HTTP limits
- `onConflictDoNothing` for idempotency
- Real-time progress logging
- Safe to re-run if interrupted

### Step 2: Compute ProfileMeta (20-30 min)

Generates aggregated statistics per profile:

```bash
# Runs automatically, or manually:
bun run src/scripts/migration/steps/compute-profile-meta.ts

# Force recompute:
FORCE=true bun run src/scripts/migration/steps/compute-profile-meta.ts
```

Computes:
- Like rate (pickiness percentage)
- Match rate (desirability percentage)
- Swipes per active day
- Conversation stats
- Filters out synthetic/missing data days

### Step 3: Seed Cohorts (<1 sec)

Creates demographic comparison groups:

```bash
# Runs automatically, or manually:
bun run src/scripts/migration/steps/seed-cohorts.ts
```

Creates 8 cohorts:
- Everyone
- Men / Women
- Men 18-24 / 25-34
- Women 18-24 / 25-34
- 35+

### Step 4: Compute Cohort Stats (2-5 min)

Generates percentile benchmarks for comparisons:

```bash
# Runs automatically, or manually:
bun run src/scripts/migration/steps/compute-cohort-stats.ts
```

Computes P10, P25, P50, P75, P90, Mean for:
- Like rate (pickiness)
- Match rate (desirability)
- Swipes per day (activity)

## Available Scripts

### Core Migration Scripts

All scripts are in `src/scripts/migration/`:

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `reset-schema.ts` | Drop and recreate schema | Start of migration |
| `run.ts` | Full pipeline (data + stats) | Complete migration |
| `run.ts --stats-only` | Stats only (skip data migration) | After data migrated |
| `steps/migrate-data.ts` | Data migration only | Manual migration |
| `steps/compute-profile-meta.ts` | ProfileMeta generation | Recompute stats |
| `steps/compute-cohort-stats.ts` | Cohort benchmarks | Update comparisons |
| `steps/seed-cohorts.ts` | Cohort definitions | Setup cohorts |

### Other Scripts

Located in `src/scripts/` subdirectories:

- `extraction/extract-json-for-testing.ts` - Extract test data
- `extraction/extract-media-from-files.ts` - Media extraction
- `extraction/extract-user-location-data.ts` - Location extraction
- `demo/generate-demo-dataset.ts` - Generate demo data
- `demo/export-demo-profile.ts` - Export demo profile
- `content/blog-script.ts` - Blog content generation

## Usage Examples

### Full Migration

```bash
OLD_DATABASE_URL=<old> DATABASE_URL=<new> bun run src/scripts/migration/run.ts
```

### Limited Profiles

```bash
PROFILE_LIMIT=1000 OLD_DATABASE_URL=<old> DATABASE_URL=<new> bun run src/scripts/migration/run.ts
```

### Dry Run Test

```bash
DRY_RUN=true PROFILE_LIMIT=100 OLD_DATABASE_URL=<old> DATABASE_URL=<new> bun run src/scripts/migration/run.ts
```

### Recompute Statistics Only

```bash
DATABASE_URL=<db> bun run src/scripts/migration/run.ts --stats-only
```

### Force Recompute ProfileMeta

```bash
FORCE=true DATABASE_URL=<db> bun run src/scripts/migration/run.ts --stats-only
```

## Estimated Duration

For ~7,000 profiles:
- Schema reset: ~5 seconds
- Core migration: ~10-15 minutes
- ProfileMeta computation: ~20-30 minutes
- Cohort seeding: ~1 second
- Cohort stats: ~2-5 minutes

**Total: 35-50 minutes**

## Troubleshooting

### Migration Fails Partway

Safe to re-run (idempotent):

```bash
OLD_DATABASE_URL=<old> DATABASE_URL=<new> bun run src/scripts/migration/run.ts
```

### Connection Errors

Test database connections:

```bash
# Test OLD database
psql "$OLD_DATABASE_URL" -c "SELECT COUNT(*) FROM \"TinderProfile\";"

# Test NEW database
psql "$DATABASE_URL" -c "SELECT 1;"
```

### HTTP 507 Response Too Large

The migration already handles this with batched queries, but if issues persist:
- Reduce `PROFILE_LIMIT`
- Batch sizes already optimized in `steps/migrate-data.ts`

### ProfileMeta Shows 0 Profiles

All profiles already have ProfileMeta. Use FORCE mode:

```bash
FORCE=true DATABASE_URL=<db> bun run src/scripts/migration/run.ts --stats-only
```

### Cohort Stats Show "0 profiles"

ProfileMeta needs to be computed first:

```bash
DATABASE_URL=<db> bun run src/scripts/migration/run.ts --stats-only
```

### Terminal Output Frozen

Press `Enter` to refresh display. The script continues running in background.

## Post-Migration Validation

### Check Record Counts

```bash
psql $DATABASE_URL << EOF
SELECT 'Users' as table, COUNT(*) FROM "user"
UNION ALL SELECT 'TinderProfiles', COUNT(*) FROM tinder_profile
UNION ALL SELECT 'ProfileMeta', COUNT(*) FROM profile_meta
UNION ALL SELECT 'Matches', COUNT(*) FROM match
UNION ALL SELECT 'Messages', COUNT(*) FROM message
UNION ALL SELECT 'CohortStats', COUNT(*) FROM cohort_stats;
EOF
```

### Start Dev Server

```bash
bun dev
```

### Test Insights Page

1. Visit `/insights/tinder/[any-tinderId]`
2. Check "How You Compare" section displays
3. Verify percentile comparisons show data

## Architecture

### Data Flow

```
Old DB (Prisma)
    ↓
steps/migrate-data.ts → Raw data only
    ↓
New DB (Drizzle)
    ↓
steps/compute-profile-meta.ts → Aggregated stats
    ↓
ProfileMeta records
    ↓
steps/compute-cohort-stats.ts → Percentile benchmarks
    ↓
CohortStats records → "How You Compare"
```

### Why Skip Old ProfileMeta?

1. **Schema mismatch** - New fields for per-active-day metrics
2. **Bad calculations** - Old included `dateIsMissingFromOriginalData` days
3. **Inconsistent filtering** - Didn't distinguish active/inactive days
4. **Fresh computation** - Ensures all profiles use same logic

### Comparison Metrics

Your implementation matches competitor features:

| Competitor | Your Metric | Cohort Stat |
|-----------|-------------|-------------|
| Average Pickiness (37%) | `likeRate` | P10-P90 percentiles |
| Average Match Rate (4.2%) | `matchRate` | P10-P90 percentiles |
| Swipes Per Day (169) | `swipesPerDay` | P10-P90 percentiles |

All segmented by gender and age cohorts.

## Safety Features

- Idempotent (safe to re-run)
- Dry run mode
- Real-time progress tracking
- Error handling with clear messages
- Confirmation prompts for destructive operations
- Batched queries to avoid limits

## Environment Variables Reference

**Required:**
- `OLD_DATABASE_URL` - Source database
- `DATABASE_URL` - Target database

**Optional:**
- `PROFILE_LIMIT` - Number of profiles (default: 99999)
- `DRY_RUN` - Preview mode (default: false)
- `FORCE` - Force recompute (default: false)
- `SKIP_SCHEMA_RESET` - Skip drop tables (default: 0)

## Need Help?

1. Check error logs for specific messages
2. Run with `DRY_RUN=true` to test
3. Test individual scripts to isolate issues
4. Verify database credentials and permissions
5. Check that `.env` file is properly configured
