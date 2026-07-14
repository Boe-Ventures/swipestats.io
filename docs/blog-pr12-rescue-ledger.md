# PR #12 rescue review ledger

Generated from source commit `b3c341d312ac5edf89fda078b880c35a5670f2e0`. Re-run with `bun src/scripts/content/blog-pr12-rescue-audit.ts`.

This ledger is the explicit editorial decision surface for the 81 recovered posts. `rewrite` retains a post only after review. `pending` means the historical draft is not publication-ready; `reviewed` means its factual boundaries, sources, tone, dates, and CTA strategy received a manual pass.

## Inventory summary

- Recovered posts: **81**
- Total draft words: **204,142**
- Review decisions: **81 rewrite / 0 keep-as-is / 0 drop**
- Editorial status: **12 reviewed / 69 pending**
- Review tiers: {"heavy":52,"light":27,"medium":2}
- Editorial batches: {"algorithm-account":9,"commercial":11,"evergreen":31,"other":30}
- Unique in-batch link targets: **52**
- Dependency-orderable posts: **81**
- Posts in dependency cycles: **0**
- Missing internal targets after recovery: **0**

## Review decisions

| Slug | Decision | Status | Tier | Batch | Words | Sources | Auto CTA | Product cards | In-batch dependencies | Risk flags |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| `ai-rizz-generator` | rewrite | reviewed | light | evergreen | 1291 | 2 | off | 1 | 0 | absolute-claim |
| `ai-text-message-generator` | rewrite | pending | light | evergreen | 3154 | 5 | on | 0 | 4 | dynamic-pricing, absolute-claim |
| `best-conversation-starters-over-text` | rewrite | reviewed | light | evergreen | 1351 | 5 | off | 1 | 0 | none |
| `break-up-text` | rewrite | pending | light | evergreen | 4399 | 6 | on | 0 | 3 | dynamic-pricing, absolute-claim |
| `bumble-boost` | rewrite | pending | heavy | commercial | 2991 | 2 | on | 0 | 0 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `bumble-messaging` | rewrite | pending | heavy | other | 2477 | 6 | on | 0 | 4 | algorithm-claim, absolute-claim, weak-source-candidate |
| `bumble-premium` | rewrite | reviewed | heavy | commercial | 1330 | 3 | off | 1 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `can-you-send-pics-on-hinge` | rewrite | pending | heavy | other | 1842 | 5 | on | 0 | 4 | dynamic-pricing, first-person-claim, algorithm-claim, absolute-claim |
| `chat-up-lines` | rewrite | pending | light | evergreen | 3939 | 4 | on | 0 | 3 | absolute-claim |
| `cheesy-pick-up-lines` | rewrite | pending | light | evergreen | 2795 | 4 | on | 0 | 4 | swipestats-data-claim, absolute-claim |
| `dirty-pick-up-lines` | rewrite | pending | heavy | evergreen | 3503 | 5 | on | 0 | 3 | first-person-claim, swipestats-data-claim, absolute-claim, adult-content |
| `does-hinge-automatically-update-your-location` | rewrite | pending | heavy | algorithm-account | 2188 | 2 | on | 0 | 5 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `double-texting` | rewrite | reviewed | light | evergreen | 1060 | 3 | on | 0 | 0 | none |
| `dry-texting` | rewrite | reviewed | light | evergreen | 973 | 3 | on | 0 | 0 | absolute-claim |
| `first-message-on-dating-app` | rewrite | reviewed | light | evergreen | 1063 | 6 | on | 0 | 0 | none |
| `flirty-emojis` | rewrite | pending | light | evergreen | 2534 | 9 | on | 0 | 4 | absolute-claim |
| `flirty-gifs` | rewrite | pending | light | evergreen | 2723 | 5 | on | 0 | 5 | absolute-claim |
| `flirty-texts-for-him` | rewrite | pending | light | evergreen | 4102 | 5 | on | 0 | 1 | dynamic-pricing, absolute-claim |
| `free-messaging-dating-sites` | rewrite | pending | heavy | other | 2331 | 3 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `good-morning-messages-for-him` | rewrite | pending | light | evergreen | 4583 | 4 | on | 0 | 4 | first-person-claim, absolute-claim |
| `good-morning-texts-for-her` | rewrite | pending | light | evergreen | 4466 | 4 | on | 0 | 0 | first-person-claim, absolute-claim |
| `good-night-texts` | rewrite | pending | light | evergreen | 4028 | 4 | on | 0 | 4 | absolute-claim |
| `hinge-algorithm` | rewrite | reviewed | heavy | algorithm-account | 1235 | 4 | off | 1 | 0 | algorithm-claim |
| `hinge-app-icons` | rewrite | pending | heavy | other | 2324 | 6 | on | 0 | 4 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-ban` | rewrite | pending | heavy | algorithm-account | 2693 | 4 | on | 0 | 0 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `hinge-boost` | rewrite | pending | heavy | commercial | 2424 | 3 | on | 0 | 2 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `hinge-conversation-starters` | rewrite | pending | light | evergreen | 3686 | 5 | on | 0 | 3 | swipestats-data-claim, absolute-claim |
| `hinge-desktop` | rewrite | pending | heavy | other | 2010 | 6 | on | 0 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-for-friends` | rewrite | pending | heavy | other | 1804 | 8 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-gift-card` | rewrite | pending | heavy | commercial | 1626 | 4 | on | 0 | 4 | dynamic-pricing, first-person-claim, algorithm-claim, absolute-claim |
| `hinge-match-note` | rewrite | pending | light | other | 2560 | 3 | on | 0 | 3 | absolute-claim |
| `hinge-most-compatible` | rewrite | pending | heavy | other | 2272 | 6 | on | 0 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-notifications` | rewrite | pending | heavy | other | 2620 | 6 | on | 0 | 5 | algorithm-claim, absolute-claim |
| `hinge-opening-lines` | rewrite | pending | light | evergreen | 3414 | 6 | on | 0 | 2 | swipestats-data-claim, absolute-claim |
| `hinge-or-bumble` | rewrite | pending | light | other | 2266 | 6 | on | 0 | 2 | dynamic-pricing, absolute-claim |
| `hinge-phone-number` | rewrite | pending | heavy | algorithm-account | 2200 | 4 | on | 0 | 3 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `hinge-roses` | rewrite | pending | heavy | commercial | 2485 | 5 | on | 0 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-standouts` | rewrite | pending | heavy | commercial | 2423 | 5 | on | 0 | 5 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-subscription` | rewrite | pending | heavy | commercial | 2257 | 3 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-verification` | rewrite | pending | heavy | other | 2132 | 7 | on | 0 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-does-facebook-dating-work` | rewrite | pending | heavy | other | 2713 | 4 | on | 0 | 3 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `how-does-hinge-work-for-guys` | rewrite | pending | heavy | other | 2735 | 3 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim, quantitative-claim |
| `how-does-match-com-work` | rewrite | pending | heavy | other | 2525 | 5 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-does-tinder-work` | rewrite | reviewed | heavy | other | 1446 | 5 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `how-many-free-likes-on-hinge` | rewrite | pending | heavy | other | 2074 | 4 | on | 0 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `how-to-ask-her-out-over-text` | rewrite | pending | light | evergreen | 2661 | 4 | on | 0 | 3 | absolute-claim |
| `how-to-cancel-tinder-gold` | rewrite | pending | heavy | other | 1839 | 3 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-find-someone-on-hinge` | rewrite | pending | heavy | other | 2195 | 6 | on | 0 | 7 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-find-someone-on-tinder` | rewrite | pending | heavy | other | 3197 | 6 | on | 0 | 1 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-flirt-over-text` | rewrite | pending | heavy | evergreen | 3996 | 4 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-get-matches-on-tinder` | rewrite | pending | heavy | other | 2434 | 2 | on | 0 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `how-to-keep-a-conversation-going-over-text` | rewrite | pending | light | evergreen | 3010 | 4 | on | 0 | 3 | swipestats-data-claim, absolute-claim |
| `how-to-like-someone-on-hinge` | rewrite | pending | heavy | other | 2613 | 5 | on | 0 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-refresh-hinge` | rewrite | pending | heavy | other | 2369 | 3 | on | 0 | 3 | algorithm-claim, evasion-or-identity-guidance, absolute-claim, quantitative-claim, weak-source-candidate |
| `how-to-reset-hinge` | rewrite | pending | heavy | algorithm-account | 2892 | 6 | on | 0 | 1 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, quantitative-claim |
| `how-to-reset-tinder` | rewrite | reviewed | heavy | algorithm-account | 1301 | 6 | off | 1 | 0 | algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `how-to-slide-into-dms` | rewrite | pending | light | evergreen | 2854 | 7 | on | 0 | 2 | swipestats-data-claim, absolute-claim |
| `how-to-talk-dirty` | rewrite | pending | heavy | evergreen | 3472 | 4 | on | 0 | 3 | absolute-claim, adult-content |
| `how-to-tell-if-she-likes-you-over-text` | rewrite | pending | heavy | evergreen | 2915 | 4 | on | 0 | 4 | algorithm-claim, absolute-claim |
| `how-to-text-a-guy-to-like-you` | rewrite | pending | light | evergreen | 2803 | 4 | on | 0 | 2 | swipestats-data-claim, absolute-claim |
| `how-to-text-a-woman` | rewrite | pending | light | evergreen | 2798 | 4 | on | 0 | 4 | absolute-claim |
| `how-to-use-hinge` | rewrite | pending | heavy | other | 3965 | 4 | on | 0 | 4 | dynamic-pricing, algorithm-claim, absolute-claim |
| `if-you-x-someone-on-hinge-what-happens` | rewrite | pending | heavy | other | 1917 | 3 | on | 0 | 6 | dynamic-pricing, algorithm-claim, absolute-claim |
| `is-hinge-a-good-dating-app` | rewrite | pending | heavy | other | 2332 | 5 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `is-hinge-better-than-tinder` | rewrite | pending | heavy | other | 2045 | 6 | on | 0 | 0 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `is-hinge-x-worth-it` | rewrite | pending | heavy | commercial | 2809 | 3 | on | 0 | 2 | dynamic-pricing, first-person-claim, swipestats-data-claim, algorithm-claim, absolute-claim, weak-source-candidate |
| `married-people-on-tinder` | rewrite | pending | heavy | other | 2152 | 5 | on | 0 | 0 | algorithm-claim, absolute-claim |
| `pick-up-lines-for-girls` | rewrite | pending | medium | evergreen | 3408 | 5 | on | 0 | 5 | first-person-claim, absolute-claim, weak-source-candidate |
| `pick-up-lines` | rewrite | reviewed | heavy | evergreen | 1735 | 4 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `tinder-boost` | rewrite | pending | heavy | commercial | 2294 | 4 | on | 0 | 0 | dynamic-pricing, first-person-claim, algorithm-claim, absolute-claim, weak-source-candidate |
| `tinder-for-friends` | rewrite | pending | heavy | other | 2577 | 8 | on | 0 | 0 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `tinder-for-seniors` | rewrite | pending | heavy | other | 2188 | 8 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `tinder-platinum` | rewrite | reviewed | heavy | commercial | 1372 | 3 | off | 1 | 0 | swipestats-data-claim, algorithm-claim, absolute-claim |
| `tinder-questionnaire` | rewrite | pending | medium | other | 3085 | 4 | on | 0 | 0 | dynamic-pricing, swipestats-data-claim, absolute-claim |
| `tinder-shadowban` | rewrite | pending | heavy | algorithm-account | 2522 | 3 | on | 0 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `tinder-subscription` | rewrite | pending | heavy | commercial | 2745 | 7 | on | 0 | 3 | dynamic-pricing, swipestats-data-claim, algorithm-claim, weak-source-candidate |
| `tinder-terms-and-conditions` | rewrite | pending | heavy | algorithm-account | 2210 | 7 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `what-does-rizz-mean` | rewrite | pending | light | evergreen | 2653 | 4 | on | 0 | 2 | absolute-claim |
| `what-to-text-your-crush` | rewrite | pending | light | evergreen | 2981 | 8 | on | 0 | 5 | first-person-claim, absolute-claim |
| `when-do-hinge-roses-reset` | rewrite | pending | heavy | algorithm-account | 1879 | 3 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `who-should-text-first-after-a-date` | rewrite | reviewed | light | evergreen | 877 | 2 | on | 0 | 0 | absolute-claim |

## Dependency cycles

No cycles detected.

## Publication dependency order

This is a mechanical topological order only. Editorial priority and the final two-per-day calendar still need to be applied.

1. `ai-rizz-generator`
2. `best-conversation-starters-over-text`
3. `bumble-boost`
4. `bumble-premium`
5. `double-texting`
6. `dry-texting`
7. `first-message-on-dating-app`
8. `good-morning-texts-for-her`
9. `flirty-texts-for-him`
10. `hinge-algorithm`
11. `hinge-ban`
12. `hinge-subscription`
13. `how-does-match-com-work`
14. `how-does-tinder-work`
15. `how-to-flirt-over-text`
16. `how-to-keep-a-conversation-going-over-text`
17. `how-to-reset-hinge`
18. `hinge-boost`
19. `how-does-hinge-work-for-guys`
20. `how-to-reset-tinder`
21. `how-to-slide-into-dms`
22. `how-to-talk-dirty`
23. `good-morning-messages-for-him`
24. `good-night-texts`
25. `flirty-emojis`
26. `how-to-tell-if-she-likes-you-over-text`
27. `break-up-text`
28. `how-to-text-a-guy-to-like-you`
29. `how-to-text-a-woman`
30. `how-to-ask-her-out-over-text`
31. `bumble-messaging`
32. `is-hinge-a-good-dating-app`
33. `hinge-for-friends`
34. `hinge-phone-number`
35. `is-hinge-better-than-tinder`
36. `how-to-use-hinge`
37. `hinge-verification`
38. `married-people-on-tinder`
39. `pick-up-lines`
40. `tinder-boost`
41. `how-to-get-matches-on-tinder`
42. `tinder-for-friends`
43. `tinder-for-seniors`
44. `how-does-facebook-dating-work`
45. `tinder-platinum`
46. `is-hinge-x-worth-it`
47. `how-to-refresh-hinge`
48. `tinder-questionnaire`
49. `tinder-terms-and-conditions`
50. `how-to-cancel-tinder-gold`
51. `tinder-shadowban`
52. `how-to-find-someone-on-tinder`
53. `tinder-subscription`
54. `what-does-rizz-mean`
55. `what-to-text-your-crush`
56. `flirty-gifs`
57. `when-do-hinge-roses-reset`
58. `hinge-roses`
59. `how-many-free-likes-on-hinge`
60. `free-messaging-dating-sites`
61. `hinge-gift-card`
62. `hinge-or-bumble`
63. `does-hinge-automatically-update-your-location`
64. `how-to-like-someone-on-hinge`
65. `hinge-app-icons`
66. `hinge-opening-lines`
67. `cheesy-pick-up-lines`
68. `dirty-pick-up-lines`
69. `hinge-conversation-starters`
70. `ai-text-message-generator`
71. `chat-up-lines`
72. `hinge-desktop`
73. `hinge-match-note`
74. `can-you-send-pics-on-hinge`
75. `hinge-notifications`
76. `hinge-standouts`
77. `hinge-most-compatible`
78. `how-to-find-someone-on-hinge`
79. `if-you-x-someone-on-hinge-what-happens`
80. `pick-up-lines-for-girls`
81. `who-should-text-first-after-a-date`
