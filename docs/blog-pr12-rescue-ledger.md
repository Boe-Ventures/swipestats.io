# PR #12 rescue review ledger

Generated from source commit `b3c341d312ac5edf89fda078b880c35a5670f2e0`. Re-run with `bun src/scripts/content/blog-pr12-rescue-audit.ts`.

This ledger is the explicit editorial decision surface for the 81 recovered posts. `rewrite` means the post is retained only after its flagged claims, sources, tone, dates, and CTA strategy have been reviewed; it does not mean the historical draft is publication-ready.

## Inventory summary

- Recovered posts: **81**
- Total draft words: **222,046**
- Review decisions: **81 rewrite / 0 keep-as-is / 0 drop**
- Review tiers: {"heavy":52,"light":26,"medium":3}
- Editorial batches: {"algorithm-account":9,"commercial":11,"evergreen":31,"other":30}
- Unique in-batch link targets: **53**
- Dependency-orderable posts: **81**
- Posts in dependency cycles: **0**
- Missing internal targets after recovery: **0**

## Review decisions

| Slug | Decision | Tier | Batch | Words | Sources | In-batch dependencies | Risk flags |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `ai-rizz-generator` | rewrite | medium | evergreen | 2315 | 7 | 3 | dynamic-pricing, first-person-claim, absolute-claim |
| `ai-text-message-generator` | rewrite | light | evergreen | 3154 | 5 | 4 | dynamic-pricing, absolute-claim |
| `best-conversation-starters-over-text` | rewrite | light | evergreen | 2401 | 4 | 3 | swipestats-data-claim, absolute-claim |
| `break-up-text` | rewrite | light | evergreen | 4399 | 6 | 3 | dynamic-pricing, absolute-claim |
| `bumble-boost` | rewrite | heavy | commercial | 2991 | 2 | 0 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `bumble-messaging` | rewrite | heavy | other | 2477 | 6 | 4 | algorithm-claim, absolute-claim, weak-source-candidate |
| `bumble-premium` | rewrite | heavy | commercial | 3259 | 4 | 1 | dynamic-pricing, first-person-claim, algorithm-claim, absolute-claim |
| `can-you-send-pics-on-hinge` | rewrite | heavy | other | 1842 | 5 | 4 | dynamic-pricing, first-person-claim, algorithm-claim, absolute-claim |
| `chat-up-lines` | rewrite | light | evergreen | 3939 | 4 | 3 | absolute-claim |
| `cheesy-pick-up-lines` | rewrite | light | evergreen | 2795 | 4 | 4 | swipestats-data-claim, absolute-claim |
| `dirty-pick-up-lines` | rewrite | heavy | evergreen | 3503 | 5 | 3 | first-person-claim, swipestats-data-claim, absolute-claim, adult-content |
| `does-hinge-automatically-update-your-location` | rewrite | heavy | algorithm-account | 2188 | 2 | 5 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `double-texting` | rewrite | light | evergreen | 2680 | 5 | 3 | absolute-claim |
| `dry-texting` | rewrite | light | evergreen | 2664 | 4 | 1 | swipestats-data-claim, absolute-claim |
| `first-message-on-dating-app` | rewrite | light | evergreen | 2467 | 6 | 3 | absolute-claim |
| `flirty-emojis` | rewrite | light | evergreen | 2534 | 9 | 4 | absolute-claim |
| `flirty-gifs` | rewrite | light | evergreen | 2723 | 5 | 5 | absolute-claim |
| `flirty-texts-for-him` | rewrite | light | evergreen | 4102 | 5 | 1 | dynamic-pricing, absolute-claim |
| `free-messaging-dating-sites` | rewrite | heavy | other | 2331 | 3 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `good-morning-messages-for-him` | rewrite | light | evergreen | 4583 | 4 | 4 | first-person-claim, absolute-claim |
| `good-morning-texts-for-her` | rewrite | light | evergreen | 4466 | 4 | 0 | first-person-claim, absolute-claim |
| `good-night-texts` | rewrite | light | evergreen | 4028 | 4 | 4 | absolute-claim |
| `hinge-algorithm` | rewrite | heavy | algorithm-account | 2649 | 6 | 1 | dynamic-pricing, first-person-claim, swipestats-data-claim, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `hinge-app-icons` | rewrite | heavy | other | 2324 | 6 | 4 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-ban` | rewrite | heavy | algorithm-account | 2693 | 4 | 0 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `hinge-boost` | rewrite | heavy | commercial | 2424 | 3 | 2 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `hinge-conversation-starters` | rewrite | light | evergreen | 3686 | 5 | 3 | swipestats-data-claim, absolute-claim |
| `hinge-desktop` | rewrite | heavy | other | 2010 | 6 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-for-friends` | rewrite | heavy | other | 1804 | 8 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-gift-card` | rewrite | heavy | commercial | 1626 | 4 | 4 | dynamic-pricing, first-person-claim, algorithm-claim, absolute-claim |
| `hinge-match-note` | rewrite | light | other | 2560 | 3 | 3 | absolute-claim |
| `hinge-most-compatible` | rewrite | heavy | other | 2272 | 6 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-notifications` | rewrite | heavy | other | 2620 | 6 | 5 | algorithm-claim, absolute-claim |
| `hinge-opening-lines` | rewrite | light | evergreen | 3414 | 6 | 2 | swipestats-data-claim, absolute-claim |
| `hinge-or-bumble` | rewrite | light | other | 2266 | 6 | 2 | dynamic-pricing, absolute-claim |
| `hinge-phone-number` | rewrite | heavy | algorithm-account | 2200 | 4 | 3 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `hinge-roses` | rewrite | heavy | commercial | 2485 | 5 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-standouts` | rewrite | heavy | commercial | 2423 | 5 | 5 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-subscription` | rewrite | heavy | commercial | 2257 | 3 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-verification` | rewrite | heavy | other | 2132 | 7 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-does-facebook-dating-work` | rewrite | heavy | other | 2713 | 4 | 3 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `how-does-hinge-work-for-guys` | rewrite | heavy | other | 2735 | 3 | 2 | dynamic-pricing, algorithm-claim, absolute-claim, quantitative-claim |
| `how-does-match-com-work` | rewrite | heavy | other | 2525 | 5 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-does-tinder-work` | rewrite | heavy | other | 2777 | 5 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim, weak-source-candidate |
| `how-many-free-likes-on-hinge` | rewrite | heavy | other | 2074 | 4 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `how-to-ask-her-out-over-text` | rewrite | light | evergreen | 2661 | 4 | 3 | absolute-claim |
| `how-to-cancel-tinder-gold` | rewrite | heavy | other | 1839 | 3 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-find-someone-on-hinge` | rewrite | heavy | other | 2195 | 6 | 7 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-find-someone-on-tinder` | rewrite | heavy | other | 3197 | 6 | 1 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-flirt-over-text` | rewrite | heavy | evergreen | 3996 | 4 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-get-matches-on-tinder` | rewrite | heavy | other | 2434 | 2 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `how-to-keep-a-conversation-going-over-text` | rewrite | light | evergreen | 3010 | 4 | 3 | swipestats-data-claim, absolute-claim |
| `how-to-like-someone-on-hinge` | rewrite | heavy | other | 2613 | 5 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-refresh-hinge` | rewrite | heavy | other | 2369 | 3 | 3 | algorithm-claim, evasion-or-identity-guidance, absolute-claim, quantitative-claim, weak-source-candidate |
| `how-to-reset-hinge` | rewrite | heavy | algorithm-account | 2892 | 6 | 1 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, quantitative-claim |
| `how-to-reset-tinder` | rewrite | heavy | algorithm-account | 2626 | 3 | 2 | dynamic-pricing, swipestats-data-claim, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `how-to-slide-into-dms` | rewrite | light | evergreen | 2854 | 7 | 2 | swipestats-data-claim, absolute-claim |
| `how-to-talk-dirty` | rewrite | heavy | evergreen | 3472 | 4 | 3 | absolute-claim, adult-content |
| `how-to-tell-if-she-likes-you-over-text` | rewrite | heavy | evergreen | 2915 | 4 | 4 | algorithm-claim, absolute-claim |
| `how-to-text-a-guy-to-like-you` | rewrite | light | evergreen | 2803 | 4 | 2 | swipestats-data-claim, absolute-claim |
| `how-to-text-a-woman` | rewrite | light | evergreen | 2798 | 4 | 4 | absolute-claim |
| `how-to-use-hinge` | rewrite | heavy | other | 3965 | 4 | 4 | dynamic-pricing, algorithm-claim, absolute-claim |
| `if-you-x-someone-on-hinge-what-happens` | rewrite | heavy | other | 1917 | 3 | 6 | dynamic-pricing, algorithm-claim, absolute-claim |
| `is-hinge-a-good-dating-app` | rewrite | heavy | other | 2332 | 5 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `is-hinge-better-than-tinder` | rewrite | heavy | other | 2045 | 6 | 0 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `is-hinge-x-worth-it` | rewrite | heavy | commercial | 2809 | 3 | 2 | dynamic-pricing, first-person-claim, swipestats-data-claim, algorithm-claim, absolute-claim, weak-source-candidate |
| `married-people-on-tinder` | rewrite | heavy | other | 2152 | 5 | 0 | algorithm-claim, absolute-claim |
| `pick-up-lines-for-girls` | rewrite | medium | evergreen | 3408 | 5 | 5 | first-person-claim, absolute-claim, weak-source-candidate |
| `pick-up-lines` | rewrite | heavy | evergreen | 4442 | 4 | 3 | swipestats-data-claim, algorithm-claim, absolute-claim, weak-source-candidate |
| `tinder-boost` | rewrite | heavy | commercial | 2294 | 4 | 0 | dynamic-pricing, first-person-claim, algorithm-claim, absolute-claim, weak-source-candidate |
| `tinder-for-friends` | rewrite | heavy | other | 2577 | 8 | 0 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `tinder-for-seniors` | rewrite | heavy | other | 2188 | 8 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `tinder-platinum` | rewrite | heavy | commercial | 2614 | 5 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim, weak-source-candidate |
| `tinder-questionnaire` | rewrite | medium | other | 3085 | 4 | 0 | dynamic-pricing, swipestats-data-claim, absolute-claim |
| `tinder-shadowban` | rewrite | heavy | algorithm-account | 2522 | 3 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `tinder-subscription` | rewrite | heavy | commercial | 2745 | 7 | 3 | dynamic-pricing, swipestats-data-claim, algorithm-claim, weak-source-candidate |
| `tinder-terms-and-conditions` | rewrite | heavy | algorithm-account | 2210 | 7 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `what-does-rizz-mean` | rewrite | light | evergreen | 2653 | 4 | 2 | absolute-claim |
| `what-to-text-your-crush` | rewrite | light | evergreen | 2981 | 8 | 5 | first-person-claim, absolute-claim |
| `when-do-hinge-roses-reset` | rewrite | heavy | algorithm-account | 1879 | 3 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `who-should-text-first-after-a-date` | rewrite | light | evergreen | 2044 | 6 | 4 | absolute-claim |

## Dependency cycles

No cycles detected.

## Publication dependency order

This is a mechanical topological order only. Editorial priority and the final two-per-day calendar still need to be applied.

1. `bumble-boost`
2. `bumble-premium`
3. `good-morning-texts-for-her`
4. `flirty-texts-for-him`
5. `hinge-ban`
6. `hinge-subscription`
7. `how-does-match-com-work`
8. `how-to-flirt-over-text`
9. `dry-texting`
10. `best-conversation-starters-over-text`
11. `how-to-reset-hinge`
12. `hinge-algorithm`
13. `hinge-boost`
14. `how-does-hinge-work-for-guys`
15. `how-to-slide-into-dms`
16. `how-to-talk-dirty`
17. `good-morning-messages-for-him`
18. `good-night-texts`
19. `flirty-emojis`
20. `how-to-tell-if-she-likes-you-over-text`
21. `how-to-text-a-woman`
22. `how-to-ask-her-out-over-text`
23. `is-hinge-a-good-dating-app`
24. `hinge-for-friends`
25. `hinge-phone-number`
26. `is-hinge-better-than-tinder`
27. `how-to-use-hinge`
28. `hinge-verification`
29. `married-people-on-tinder`
30. `tinder-boost`
31. `how-does-tinder-work`
32. `how-to-get-matches-on-tinder`
33. `tinder-for-friends`
34. `tinder-for-seniors`
35. `how-does-facebook-dating-work`
36. `tinder-platinum`
37. `how-to-reset-tinder`
38. `is-hinge-x-worth-it`
39. `how-to-refresh-hinge`
40. `tinder-questionnaire`
41. `tinder-terms-and-conditions`
42. `how-to-cancel-tinder-gold`
43. `tinder-shadowban`
44. `how-to-find-someone-on-tinder`
45. `tinder-subscription`
46. `what-to-text-your-crush`
47. `double-texting`
48. `break-up-text`
49. `bumble-messaging`
50. `flirty-gifs`
51. `how-to-keep-a-conversation-going-over-text`
52. `what-does-rizz-mean`
53. `when-do-hinge-roses-reset`
54. `hinge-roses`
55. `how-many-free-likes-on-hinge`
56. `free-messaging-dating-sites`
57. `hinge-gift-card`
58. `hinge-or-bumble`
59. `does-hinge-automatically-update-your-location`
60. `how-to-like-someone-on-hinge`
61. `hinge-app-icons`
62. `hinge-opening-lines`
63. `hinge-conversation-starters`
64. `ai-text-message-generator`
65. `first-message-on-dating-app`
66. `hinge-desktop`
67. `hinge-match-note`
68. `can-you-send-pics-on-hinge`
69. `hinge-notifications`
70. `hinge-standouts`
71. `hinge-most-compatible`
72. `how-to-find-someone-on-hinge`
73. `how-to-text-a-guy-to-like-you`
74. `if-you-x-someone-on-hinge-what-happens`
75. `pick-up-lines`
76. `ai-rizz-generator`
77. `chat-up-lines`
78. `cheesy-pick-up-lines`
79. `dirty-pick-up-lines`
80. `pick-up-lines-for-girls`
81. `who-should-text-first-after-a-date`
