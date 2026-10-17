# Hinge comparisons

Open Compare beside Share on a Hinge insights page. Paste another Hinge insights
link or use Browse profiles. Selection is stored in `?compare=...` and supports
four profiles including the base profile. Each person uploads under their own
account.

The chart uses actual UTC calendar dates, spanning the union of profile periods.
It does not align account starts or restrict the chart to overlapping periods.
Counts are bucketed daily, weekly (Monday start), or monthly on one shared scale.
Date filters are inclusive. Outside an export's period, series values are null.
Inside the period, a supported metric with no retained records is zero.
Unavailable metrics remain N/A, including CSV matches and JSON skips/roses.
Ranges exceeding 5,000 buckets ask the user to narrow the range or group more
coarsely rather than silently omitting the end of the chart.

The public comparison API projects aggregate dates/counts only. No message
content, conversation IDs, subscriptions, or private life events are returned.
Counts come from records, not potentially stale legacy profile metadata. CSV
activity takes precedence for CSV profiles; older JSON profiles use match/message
records and LIKE_SENT interactions. MESSAGE_SENT interactions are not counted
again. Conversation counts are dated by their first retained outgoing message;
voice notes count as outgoing messages. Conversation-size medians cover the full
retained history and do not follow date filters. Retained records are incomplete
history, so cross-format match-conversion and reply rates are not offered.

## Validation

- Focused tests protect disjoint calendar coverage, unavailable versus zero,
  message double counting, private ID omission, inclusive filter totals, and long
  ranges. These consequential semantic failures are not caught by TypeScript.
- Manual browser QA with fictional JSON/CSV profiles: add a pasted link, shareable
  URL selection, remove, date filters/reset, unsupported matches, two separated
  series, and desktop/mobile layouts without horizontal overflow.
- Browser QA uses mocked public tRPC responses and does not upload or publish
  customer exports. Existing Tinder comparison imports use the shared palette
  through their original module path.
