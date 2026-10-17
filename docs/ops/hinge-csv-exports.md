# Hinge CSV exports

## Evidence and scope

An October 2026 user-provided Hinge download contains nested CSV tables, TXT
files describing those tables, and local media. It contains no JSON files.
The archive itself and its personal data are not checked into this repository.
This establishes a format we must support, not that every region/account has
switched. Existing JSON uploads remain available with their existing identity,
ownership, transport, and additive-update behavior.

Hinge's [data request guidance](https://help.hinge.co/hc/en-us/articles/360004792234-How-can-I-make-a-Data-Request)
warns that exports exclude other members' personal information. It does not
publish a CSV schema or guarantee complete conversation history. Treat the
supplied files as evidence of observed events, not a full account ledger.

## Source interpretation

| Table                                            | Supported interpretation                                                                                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`                                           | Sparse field updates ordered by timestamp, not full profile snapshots. Nonempty fields update the profile; blank cells carry no update. `signup_timestamp` supplies identity. Birthday, when present, derives age locally and is discarded. |
| `registration`                                   | Authentication event, not account creation. Its timestamp must not replace signup.                                                                                                                                                          |
| `match_likes`                                    | Ordinary likes sent, with a boolean for whether a comment exists. No comment text is retained.                                                                                                                                              |
| `match_roses`                                    | Roses sent, separate from ordinary likes.                                                                                                                                                                                                   |
| `match_skips`                                    | Recorded skips, without claiming they are all rejected incoming likes.                                                                                                                                                                      |
| `match_blocks`                                   | Blocks, without inferring pre-match rejects or post-match unmatches.                                                                                                                                                                        |
| `chat_message`                                   | Direction, timestamp, hashed account-scoped conversation identity, and Unicode character count. Message text is discarded. The supplied example contains only `sent` rows.                                                                  |
| `chat_voice_note`                                | Direction, timestamp, and hashed conversation identity. Audio bytes and source URLs are discarded.                                                                                                                                          |
| `profile_prompt_answers`, `profile_prompt_polls` | Active prompt snapshot. Both tables must be supplied to replace an existing prompt snapshot; a partial selection must not erase the other prompt type.                                                                                      |
| `user_media`                                     | Active remote Hinge media URLs, subject to existing photo consent and broken-media filtering. Local JPG/WebP/MP4 files are not uploaded.                                                                                                    |

Read CSV with quoted commas, multiline fields, escaped quotes, UTF-8 BOMs,
and CRLF/LF endings. Reject malformed records, missing expected headers,
unsupported directions, contradictory signup values, and pre-signup activity.
Empty provider placeholder rows are ignored; a header-only activity table is
valid. Recognize exact basenames at any ZIP depth. Ignore macOS resource forks,
TXT descriptions, and unknown sidecars. Reject duplicate recognized basenames
within one selection and mixed JSON/CSV selections.

Require `user.csv` plus at least one activity table. The ZIP supplies all
recognized tables automatically; individual files can be added in stages.
Missing tables are distinct from supplied empty tables. Error messages displayed
by the browser do not include provider cells, filenames, or parse snippets.

## What the data cannot establish

There is no match event table, match date, relationship between a sent like and
a conversation, incoming-like ledger, or we-met outcome. Message `match_id`
identifies a conversation with exported messages, not all matches. Its first
message timestamp is not a match date. A missing received-message row is not
proof of no reply. Therefore CSV insights display match totals/conversion,
incoming likes, reply rates, time to match, and date outcomes as unavailable.
Do not manufacture matches or feed CSV likes and invented matches into legacy
match-rate calculations or SwipeRank. SwipeRank's current fact builder is
Tinder-only. Hinge CSV events are not inserted into legacy interaction/match
rows or their profile-meta calculations.

Profile update blanks are ambiguous for explicit clearing versus no change.
The example uses them as sparse omissions. We retain the latest nonempty value
rather than claiming to reconstruct every historical deletion. Provider list
fields may use unquoted bracket notation; JSON string lists are preferred,
with comma-separated bracket lists accepted for the observed profile fields.
The CSV `max_distance` field does not declare its unit, so it is not mapped
to the legacy miles column. The most recent timestamp across recognized tables is an observed-through
bound, not an exact last-login time. Exact birthday is never persisted.

## Persistence and reuploads

The additive `hinge_profile.csv_activity` JSONB column stores a versioned,
allowlisted activity ledger. The server validates it again before persistence.
The existing temporary Blob lease, session binding, profile identity check,
ownership predicate, provider/profile locks, transaction, and post-commit
cleanup cover CSV uploads too. Consent filtering still runs in the browser and
server. Mutation responses return only the resulting `hingeId`, avoiding a
multi-megabyte activity response or exposing internal event identities.

An event identity hashes account, event kind, raw provider timestamp,
conversation ID where present, and content/comment/voice-note URL locally.
Identical occurrences receive increasing suffixes. Union by these identities
preserves maximum observed multiplicity, survives row reordering, and retains
events missing from a narrower subsequent download. This relies on the provider
keeping the spelling and content of an event stable across exports. Changed
provider content may be an additional observation; we cannot prove it is an edit
because the provider supplies no event ID. Cross-account unions retain
account-scoped hashes and move the ledger inside the existing merge transaction.

CSV and older JSON histories remain separate: the old export has no durable
conversation identifiers to join with CSV match IDs, and global likes cannot
be matched to old thread-specific likes reliably. They are never summed.
Earlier JSON insights remain accessible as a separately labeled historical view.

Public insights return daily totals and aggregate conversation statistics.
They omit event identities, conversation hashes, content, and source URLs.
Date filtering applies to activity counts and charts; all-history conversation
and message-length summaries are explicitly labeled. IP/port request logs,
selfie image bytes, consent logs, support/harm reports, consumable purchase records,
conversation starters, friends' takes, and backstory files are not imported.
Purchase prices and currencies require separate entitlement/refund semantics
before any spending total can be claimed.

## Automatic subscription events

`store_subscription_purchases.csv` is optional. Its transaction rows can repeat
subscription dates or revise the end date for the same start. Keep the newest
provider observation per account/start, rather than creating an event for each
transaction. Scheduled end dates may be in the future. Conflicting end dates at
an identical observation timestamp are rejected rather than chosen by row order.

Use the existing `event` table and `SUBSCRIPTION` type, named "Hinge subscription".
The file does not identify Plus versus X. A deterministic account-scoped source prefix in the event ID
makes imports idempotent per owner, including after anonymous account conversion.
A random suffix avoids collisions between owners importing the same source. Newer exports can correct dates while the event still
matches its previously imported baseline. Manual date edits and customized names
are preserved. Narrower/older exports never delete retained events or shorten
newer source evidence. Events remain user-owned across account-history merges.
Deleting an imported event removes it normally; uploading its source history
again can recreate it.

Retain only normalized start/end/observation dates and an opaque source hash in
`csv_activity.subscriptions`. Hinge transport blobs are temporary and are cleaned
after commit, so the original export is not an archive we can regenerate from.
The normalized periods let us rebuild events without storing the original file
or billing details. No additional subscription table or event columns are needed.

The CSV chart uses a numeric UTC time axis so subscription bands can start/end
inside monthly buckets and remain visible when clipped by a selected date range.
Adjacent/overlapping imported renewals share a continuous visual band, while the
underlying life events keep individual period dates. Only signed-in owners fetch
their private events; public profile summaries do not include subscription dates.

## Validation rationale

The new focused tests protect the missing CSV boundary against identifier leaks,
incorrect sparse-profile reconstruction, lost/duplicated reupload activity, and
accepting malformed source data. They use invented fixtures only. This is
consequential privacy/data-loss protection under the repository's test policy.

Validate real exports locally without logging cells or retaining them in test
fixtures. Rehearse the generated additive migration and create/retry/narrower
upload/cross-account transfer in a disposable database. Confirm that CSV events
survive, legacy match/interaction rows are not fabricated, and consent withdrawal
removes media/work information. Shared dev and production migration policies are
unchanged.
