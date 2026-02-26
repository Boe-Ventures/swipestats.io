# SwipeStats Research Dataset — Variable Definition Guide

**Dataset**: Tinder profiles export (`research-YYYY-MM-DD.jsonl`)
**Format**: JSONL — one JSON object per line, one line per profile
**Source**: SwipeStats platform — user-submitted GDPR data exports from Tinder
**Last updated**: 2026-02-23

---

## Dataset Structure

Each line is a JSON object with four top-level keys:

```json
{
  "profile": { ... },
  "user":    { ... },
  "meta":    { ... },
  "usage":   [ ... ],
  "matches": [ ... ]
}
```

`user` may be `null` if geo data was not resolved. `meta` may be `null` if statistics have not been computed yet.

---

## 1. `profile` — Tinder Profile

Raw profile data as reported in the user's Tinder GDPR export. Fields may have been partially redacted for PII (see notes per field).

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `profile.tinderId` | string | No | Internal SwipeStats identifier for this profile. Pseudonymous — not the user's actual Tinder ID |
| `profile.gender` | enum | No | `MALE`, `FEMALE`, `OTHER`, `MORE`, `UNKNOWN` |
| `profile.birthDate` | ISO timestamp | No | Date of birth. Day is set to 1st of month to reduce precision |
| `profile.ageAtUpload` | integer | No | Age when the user uploaded their data to SwipeStats |
| `profile.ageAtLastUsage` | integer | No | Age on the last recorded day of Tinder activity |
| `profile.bio` | string | Yes | Current profile bio. May contain `[PHONE_NUMBER]`, `[EMAIL]`, `[SOCIAL_HANDLE]`, `[FULL_NAME]`, `[ADDRESS]` redaction tokens where PII was detected |
| `profile.bioOriginal` | string | Yes | Bio before PII redaction. **Sensitive** — contains raw user-written text including potential PII. Only include in top-tier academic packages |
| `profile.city` | string | Yes | City as reported in Tinder export. Self-reported, not verified |
| `profile.country` | string | Yes | Country as reported in Tinder export |
| `profile.region` | string | Yes | State/province as reported in Tinder export |
| `profile.interests` | array\|null | Yes | Facebook-connected interests (older accounts). Array of interest objects from Tinder's data |
| `profile.userInterests` | string[] | Yes | Tinder in-app interest tags, e.g. `["Travel", "Cooking", "Hiking"]` |
| `profile.sexualOrientations` | string[] | Yes | e.g. `["Straight"]`, `["Gay"]`, `["Bisexual"]`. May be null for older accounts |
| `profile.descriptors` | array | Yes | Tinder "About Me" descriptor cards. Structure varies by Tinder version |
| `profile.instagramConnected` | boolean | No | Whether the user had Instagram linked to their Tinder profile at time of export |
| `profile.spotifyConnected` | boolean | No | Whether the user had Spotify linked to their Tinder profile at time of export |
| `profile.jobTitle` | string | Yes | Self-reported job title |
| `profile.company` | string | Yes | Self-reported employer name |
| `profile.school` | string | Yes | Primary school name (first school listed) |
| `profile.educationLevel` | string | Yes | e.g. `"BACHELORS"`, `"MASTERS"`, `"PHD"`, `"HIGH_SCHOOL"`. Tinder-reported |
| `profile.ageFilterMin` | integer | No | Minimum age the user set in their search preferences |
| `profile.ageFilterMax` | integer | No | Maximum age the user set in their search preferences |
| `profile.interestedIn` | enum | No | Gender the user is seeking: `MALE`, `FEMALE`, `OTHER`, `MORE`, `UNKNOWN` |
| `profile.genderFilter` | enum | No | Gender filter setting: `MALE`, `FEMALE`, `OTHER`, `MORE`, `UNKNOWN` |
| `profile.createDate` | ISO timestamp | No | Date the Tinder account was created |
| `profile.activeTime` | ISO timestamp | Yes | Last recorded activity timestamp from Tinder export |
| `profile.firstDayOnApp` | ISO timestamp | No | Date of earliest usage record in the dataset |
| `profile.lastDayOnApp` | ISO timestamp | No | Date of latest usage record in the dataset |
| `profile.daysInProfilePeriod` | integer | No | Calendar days between `firstDayOnApp` and `lastDayOnApp` |

---

## 2. `user` — Geographic & Platform Context

Resolved from the SwipeStats user account linked to this profile. May be `null`.

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `user.continent` | string | Yes | e.g. `"Europe"`, `"North America"`, `"Asia"` |
| `user.country` | string | Yes | ISO country name, e.g. `"Norway"`, `"United States"` |
| `user.region` | string | Yes | State or province, e.g. `"California"`, `"Bavaria"` |
| `user.city` | string | Yes | City name |
| `user.languages` | string[] | Yes | ISO 639-1 language codes detected from conversation analysis, e.g. `["en", "no"]`. Ordered by frequency. Derived — not self-reported |
| `user.timeZone` | string | Yes | IANA timezone string, e.g. `"Europe/Oslo"`, `"America/Los_Angeles"` |

---

## 3. `meta` — Pre-computed Aggregate Statistics

Computed by SwipeStats from the full usage and match history. All metrics exclude synthetic/inferred days (gaps in usage data are not filled with zeros). May be `null`.

### Time Period

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `meta.from` | ISO timestamp | No | Start of the period covered by this profile's data |
| `meta.to` | ISO timestamp | No | End of the period covered by this profile's data |
| `meta.daysInPeriod` | integer | No | Calendar days between `from` and `to` |
| `meta.daysActive` | integer | No | Days where at least one swipe (like or pass) was recorded |

### Swipe Totals

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `meta.swipeLikesTotal` | integer | No | Total right swipes (likes) across the full period |
| `meta.swipePassesTotal` | integer | No | Total left swipes (passes) across the full period |
| `meta.matchesTotal` | integer | No | Total matches received |
| `meta.appOpensTotal` | integer | No | Total app open events |

### Messaging Totals

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `meta.messagesSentTotal` | integer | No | Total messages sent by this user |
| `meta.messagesReceivedTotal` | integer | No | Total messages received |

### Rates

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `meta.likeRate` | float | No | `swipeLikesTotal / (swipeLikesTotal + swipePassesTotal)`. Range: 0–1. Proxy for pickiness (higher = less selective) |
| `meta.matchRate` | float | No | `matchesTotal / swipeLikesTotal`. Range: 0–1. Proxy for desirability |
| `meta.swipesPerDay` | float | No | `(swipeLikesTotal + swipePassesTotal) / daysActive`. Average swipe volume on active days |

### Conversation Statistics

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `meta.conversationCount` | integer | No | Total number of matches (including those with no messages) |
| `meta.conversationsWithMessages` | integer | No | Matches where at least one message was exchanged |
| `meta.ghostedCount` | integer | No | Matches with zero messages. `conversationCount - conversationsWithMessages` |
| `meta.averageResponseTimeSeconds` | integer | Yes | Median of per-conversation median response times. Robust to outlier conversations |
| `meta.meanResponseTimeSeconds` | integer | Yes | True mean response time. More sensitive to outliers than `averageResponseTimeSeconds` |
| `meta.medianConversationDurationDays` | integer | Yes | Median number of days from first to last message across all conversations |
| `meta.longestConversationDays` | integer | Yes | Duration in days of the longest single conversation |
| `meta.averageMessagesPerConversation` | float | Yes | Mean messages per conversation (includes both sent and received) |
| `meta.medianMessagesPerConversation` | integer | Yes | Median messages per conversation. More robust than mean for skewed distributions |

---

## 4. `usage[]` — Daily Activity Records

One record per day where any activity was recorded. Days with no activity are not present (no zero-fill). Ordered chronologically.

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `usage[].dateStamp` | ISO timestamp | No | The calendar date for this record |
| `usage[].appOpens` | integer | No | Number of times the app was opened that day |
| `usage[].swipeLikes` | integer | No | Right swipes that day |
| `usage[].swipeSuperLikes` | integer | No | Super likes sent that day |
| `usage[].swipePasses` | integer | No | Left swipes that day |
| `usage[].swipesCombined` | integer | No | `swipeLikes + swipePasses + swipeSuperLikes` |
| `usage[].matches` | integer | No | Matches received that day |
| `usage[].messagesSent` | integer | No | Messages sent that day |
| `usage[].messagesReceived` | integer | No | Messages received that day |
| `usage[].matchRate` | float | No | `matches / swipeLikes` for that day. `0` if no likes sent |
| `usage[].likeRate` | float | No | `swipeLikes / swipesCombined` for that day. `0` if no swipes |
| `usage[].messagesSentRate` | float | No | `messagesSent / (messagesSent + messagesReceived)` for that day |
| `usage[].responseRate` | float | No | `messagesReceived / matches` for that day. Proxy for conversation conversion |
| `usage[].engagementRate` | float | No | Composite engagement metric for that day |
| `usage[].userAgeThisDay` | integer | No | The user's age on this specific date. Useful for longitudinal analysis |

---

## 5. `matches[]` — Conversations

One entry per match. Ordered by `match.order` (chronological). Includes both matches with and without messages. Each entry has two sub-objects: `match` (conversation-level stats) and `messages[]` (individual messages).

### 5a. `matches[].match` — Conversation Statistics

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `match.id` | string | No | Pseudonymous match identifier. Consistent across exports of the same dataset |
| `match.order` | integer | No | Chronological index of this match (1 = first match ever) |
| `match.totalMessageCount` | integer | No | Total messages in this conversation (sent + received) |
| `match.textCount` | integer | No | Number of text messages |
| `match.gifCount` | integer | No | Number of GIFs sent |
| `match.gestureCount` | integer | No | Number of gesture/reaction messages |
| `match.otherMessageTypeCount` | integer | No | Voice notes, activity cards, contact cards, etc. |
| `match.primaryLanguage` | string | Yes | ISO 639-1 code of the dominant language detected in this conversation, e.g. `"en"`, `"no"`, `"de"`. LLM-derived |
| `match.languages` | string[] | No | All languages detected in this conversation, ordered by frequency |
| `match.initialMessageAt` | ISO timestamp | Yes | Timestamp of the first message in the conversation |
| `match.lastMessageAt` | ISO timestamp | Yes | Timestamp of the most recent message |
| `match.engagementScore` | integer | Yes | Composite engagement score for this conversation. Higher = more engaged. Methodology TBD |
| `match.responseTimeMedianSeconds` | integer | Yes | Median time (seconds) between received message and user's reply in this conversation |
| `match.conversationDurationDays` | integer | Yes | Days from `initialMessageAt` to `lastMessageAt` |
| `match.messageImbalanceRatio` | float | Yes | Ratio of messages sent vs received. `1.0` = perfectly balanced. `>1` = user sent more |
| `match.longestGapHours` | integer | Yes | Longest silence in the conversation, in hours |
| `match.didMatchReply` | boolean | Yes | Whether the other person ever replied |
| `match.lastMessageFrom` | string | Yes | `"USER"` or `"MATCH"` — who sent the final message |

### 5b. `matches[].messages[]` — Individual Messages

One record per message in the conversation. Ordered by `order`.

| Variable | Type | Nullable | Description |
|----------|------|----------|-------------|
| `message.content` | string | No | Message text. May contain redaction tokens (`[PHONE_NUMBER]`, `[EMAIL]`, etc.) where PII was detected. For text messages; GIFs and gestures will have placeholder content |
| `message.contentRaw` | string | No | Original message text before any PII redaction. **Sensitive** — only include in top-tier academic packages |
| `message.charCount` | integer | No | Character count of the message |
| `message.messageType` | enum | No | `TEXT`, `GIF`, `VOICE_NOTE`, `GESTURE`, `ACTIVITY`, `CONTACT_CARD`, `OTHER` |
| `message.sentDate` | ISO timestamp | No | When the message was sent |
| `message.order` | integer | No | Position of this message in the conversation (1 = first) |
| `message.language` | string | Yes | ISO 639-1 language code detected for this specific message. LLM-derived |
| `message.to` | integer | No | Tinder internal field. `0` = sent by the other person, values `> 0` = sent by this user. Use to distinguish user-sent vs received messages |

---

## Notes on Data Quality

**PII redaction**: Bio and message content have been processed to remove identifiable information. Redaction is LLM-based and not guaranteed to be 100% complete. The `bioOriginal` and `contentRaw` fields contain unredacted text and should be treated as sensitive.

**Missing data**: Fields marked nullable are frequently null for older Tinder accounts (pre-2018) which had fewer profile fields. `sexualOrientations` and `descriptors` in particular were not collected by Tinder in early versions.

**Usage gaps**: Usage records only exist for days Tinder reported activity. Multi-day gaps in `usage[]` represent periods of inactivity, not missing data.

**Language detection**: `match.primaryLanguage` and `user.languages` are derived from LLM analysis of message content and may not be available for all profiles (`llmAnalyzedAt IS NULL`).

**Self-reported data**: All profile fields (`jobTitle`, `company`, `school`, `educationLevel`, `city`, `country`) are self-reported by users in the Tinder app and have not been verified.

**Geography**: `profile.city/country/region` comes from Tinder's raw export and reflects what was in the profile at export time. `user.city/country/region` is resolved by SwipeStats from IP/registration data and may be more accurate.
