# Profile Compare

> Status doc / pick-up notes. Last updated 2026-06-03.
>
> Internal/code name: **`profile-compare`** (routes), **`profileCompare`** (tRPC),
> `ProfileComparisonService` (service). Sometimes referred to loosely as
> "profile preview". This doc is the planning/status source of truth — the
> behavioral source of truth is the code (`profile-comparison.service.ts`).

## What it is

Let a user build a side-by-side **comparison of their dating profiles across apps**
(Tinder / Hinge / Bumble / …), then share a public link so other people can
**rate and comment** on individual photos/prompts. There's a photo-ranking
algorithm that scores which photos perform best from the collected feedback.

The pitch (from the waitlist gate copy):
- A/B test different profile versions
- Get feedback from other users
- Optimize for better matches

## Current state — one-line summary

**Backend is complete (DB + API + service). Frontend is fully scaffolded but the
authenticated editor is locked behind a `ComingSoonWrapper` waitlist gate. The
public share + feedback flow is NOT gated and appears functional.** All on
`main`; no open branch. Not touched since the v4 build + lint sweeps.

---

## Architecture

### Database (`src/server/db/schema.ts`)

| Table | Lines | Purpose |
|---|---|---|
| `profile_comparison` | ~1000 | Container: `name`, `profileName`, `defaultBio`, age, city/state/country, hometown, nationality, `heightCm`, `educationLevel`, `isPublic`, **`shareKey`** (unique), timestamps |
| `comparison_column` | ~1045 | One column per app — `dataProvider` enum, `order`, `bio`, `title` |
| `comparison_column_content` | ~1079 | Items in a column — `type: "photo" \| "prompt"`, `attachmentId`, `caption`, `prompt`, `answer`, `order` |
| `profile_comparison_feedback` | ~1123 | Ratings + comments. **Polymorphic**: targets `contentId` OR `columnId`. `authorId`, `actorType: "user" \| "system"`, `rating` (-1..5), `body`, soft-delete via `deletedAt` |
| `attachment` | ~962 | Blob-backed media. `resourceType` enum (`profile_comparison`, `comparison_column`, `user_photo`, …), `resourceId`, `url`, `metadata`, soft-delete |

Relations defined ~1504-1565. `dataProvider` enum values (schema:15): `TINDER, HINGE, BUMBLE, GRINDER, BADOO, BOO, OK_CUPID, FEELD`.

### tRPC API (`src/server/api/routers/profileCompareRouter.ts`)

24 procedures. Public ones key off `shareKey`; the rest are `protectedProcedure`.

**Comparisons:** `list`, `get`, `getPublic` (public), `create`, `update`, `delete`
**Columns:** `addColumn`, `updateColumn`
**Content:** `addContentToColumn`, `reorderContent`, `updateContent`, `deleteContent`
**Content (LEGACY — see cleanup):** `addPhotoToColumn`, `reorderPhotos`, `deletePhoto`
**Feedback:** `createFeedback`, `updateFeedback`, `deleteFeedback`, `getFeedback` (public), `getFeedbackForAttachment` (public)
**Anonymous / friends:** `updateAnonymousUserName`, `getForFriendCreation` (public), `createFriendColumn`
**Ranking:** `getPhotoSummary`

### Service (`src/server/services/profile-comparison.service.ts`, ~1200 lines)

All business logic with transaction support. Notable: the **photo-ranking
algorithm** (~lines 988-1183):

```
score = position * 0.4 + frequency * 0.3 + rating * 0.3
```

Plus owner/author permission checks, soft-deletes, share-key public access, and
the friend-column creation workflow.

### UI

**Authenticated editor — `src/app/app/profile-compare/`** (GATED)
- `page.tsx` — dashboard listing the user's comparisons. Wrapped in
  `ComingSoonWrapper` (`page.tsx:37`, `topic="waitlist-profile-compare"`). The
  real dashboard is `ProfileCompareDashboardContent` rendered as its child.
- `[id]/page.tsx` — single comparison editor; `[id]/summary/page.tsx` — photo
  summary/ranking; `photos/page.tsx` — photo gallery/upload; `layout.tsx`;
  `create-comparison-dialog.tsx`.
- `[id]/` components: `comparison-detail`, `comparison-column`, `stack-view`,
  `flow-view`, `summary-tab`, `add-content-dialog`, `edit-content-dialog`,
  `photo-summary-item`, `prompt-selector`, `provider-config.ts`.

**Public share — `src/app/share/profile-compare/[shareKey]/`** (NOT gated)
- `page.tsx` — view-only comparison; viewers can leave feedback.
- `view-only-column.tsx`, `feedback-summary.tsx`, `feedback-dialog.tsx`,
  `anonymous-name-prompt.tsx`.

**Marketing teasers — `src/app/(marketing)/insights/tinder/[tinderId]/`**
- `_components/SwipestatsProfilePreview.tsx`, `_components/ProfileCompareCtaCard.tsx`,
  `ComparisonProvider.tsx`, `compare/page.tsx` (+ `compare/_components/`).
- Dashboard entry point: `src/app/app/dashboard/ProfileCompareSection.tsx`.

### Launch / marketing machinery (already set up)

- Resend waitlist audience `profile_compare_waitlist`
  (`src/scripts/resend/README.md:46`).
- Newsletter topic `NEWSLETTER_TOPICS.PROFILE_COMPARE`
  (`src/scripts/resend/NEWSLETTER_STRATEGY.md:36`).
- Pre-written broadcast **"Profile Compare is Now Live!"** for topic
  `waitlist-profile-compare` (`src/scripts/resend/TOPICS_AND_BROADCASTS.md:456`).

---

## Known gaps / cleanup

1. **Legacy vs generic content endpoints coexist.** `addPhotoToColumn` /
   `reorderPhotos` / `deletePhoto` (photo-only) sit alongside the newer
   `addContentToColumn` / `reorderContent` / `deleteContent` (photo-or-prompt).
   Looks like a photo→content migration that was started but the old wrappers
   were never removed. **TODO:** confirm nothing still calls the legacy three,
   then delete them.
2. **Editor flow not verified end-to-end.** Because the dashboard is gated,
   the create → add columns → add photos/prompts → publish → share path hasn't
   been exercised recently. Needs a manual walkthrough.
3. **Gate also hides the working dashboard.** Removing `ComingSoonWrapper`
   exposes `ProfileCompareDashboardContent` (already built: grid, thumbnails,
   public/private toggle, share link, delete).

---

## To launch — checklist

- [ ] Walk the authenticated editor flow end-to-end (create → columns →
      content → publish → public share → feedback → photo summary/ranking).
- [ ] Remove the legacy photo endpoints (`addPhotoToColumn`, `reorderPhotos`,
      `deletePhoto`) after confirming no callers.
- [ ] Decide rating scale UX (schema allows -1..5 — confirm what the UI sends).
- [ ] Remove / flip the `ComingSoonWrapper` gate in
      `src/app/app/profile-compare/page.tsx` (and check
      `ProfileCompareSection.tsx`).
- [ ] Verify anonymous feedback + `updateAnonymousUserName` on the share page.
- [ ] QA the friend-column flow (`getForFriendCreation`, `createFriendColumn`).
- [ ] Fire the Resend "Profile Compare is Now Live!" broadcast to
      `waitlist-profile-compare`.

---

## Quick pointers

- Logic: `src/server/services/profile-comparison.service.ts`
- API: `src/server/api/routers/profileCompareRouter.ts`
- Schema: `src/server/db/schema.ts` (~962-1171, relations ~1504-1565)
- Gate: `src/app/app/profile-compare/page.tsx:37`
- Public flow: `src/app/share/profile-compare/[shareKey]/`
