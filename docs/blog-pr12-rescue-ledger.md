# PR #12 rescue review ledger

Generated from source commit `b3c341d312ac5edf89fda078b880c35a5670f2e0`. Re-run with `bun src/scripts/content/blog-pr12-rescue-audit.ts`.

This ledger is the explicit editorial decision surface for the 81 recovered posts. `rewrite` retains a post only after review. `pending` means the historical draft is not publication-ready; `reviewed` means its factual boundaries, sources, tone, dates, and CTA strategy received a manual pass.

## Inventory summary

- Recovered posts: **81**
- Total draft words: **162,813**
- Review decisions: **81 rewrite / 0 keep-as-is / 0 drop**
- Editorial status: **36 reviewed / 45 pending**
- Review tiers: {"heavy":40,"light":39,"medium":2}
- Editorial batches: {"algorithm-account":9,"commercial":11,"evergreen":31,"other":30}
- Unique in-batch link targets: **43**
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
| `can-you-send-pics-on-hinge` | rewrite | reviewed | light | other | 584 | 4 | on | 0 | 0 | absolute-claim |
| `chat-up-lines` | rewrite | pending | light | evergreen | 3939 | 4 | on | 0 | 3 | absolute-claim |
| `cheesy-pick-up-lines` | rewrite | pending | light | evergreen | 2795 | 4 | on | 0 | 4 | swipestats-data-claim, absolute-claim |
| `dirty-pick-up-lines` | rewrite | pending | heavy | evergreen | 3503 | 5 | on | 0 | 3 | first-person-claim, swipestats-data-claim, absolute-claim, adult-content |
| `does-hinge-automatically-update-your-location` | rewrite | reviewed | light | algorithm-account | 465 | 2 | on | 0 | 0 | none |
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
| `hinge-ban` | rewrite | reviewed | heavy | algorithm-account | 706 | 4 | on | 0 | 0 | evasion-or-identity-guidance |
| `hinge-boost` | rewrite | reviewed | heavy | commercial | 859 | 3 | on | 0 | 0 | algorithm-claim, absolute-claim |
| `hinge-conversation-starters` | rewrite | pending | light | evergreen | 3686 | 5 | on | 0 | 3 | swipestats-data-claim, absolute-claim |
| `hinge-desktop` | rewrite | pending | heavy | other | 2010 | 6 | on | 0 | 3 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-for-friends` | rewrite | pending | heavy | other | 1804 | 8 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-gift-card` | rewrite | pending | heavy | commercial | 1626 | 4 | on | 0 | 4 | dynamic-pricing, first-person-claim, algorithm-claim, absolute-claim |
| `hinge-match-note` | rewrite | reviewed | light | other | 690 | 2 | on | 0 | 0 | none |
| `hinge-most-compatible` | rewrite | reviewed | light | other | 695 | 4 | on | 0 | 0 | none |
| `hinge-notifications` | rewrite | reviewed | light | other | 706 | 4 | on | 0 | 0 | none |
| `hinge-opening-lines` | rewrite | pending | light | evergreen | 3414 | 6 | on | 0 | 2 | swipestats-data-claim, absolute-claim |
| `hinge-or-bumble` | rewrite | pending | light | other | 2266 | 6 | on | 0 | 2 | dynamic-pricing, absolute-claim |
| `hinge-phone-number` | rewrite | reviewed | heavy | algorithm-account | 464 | 4 | on | 0 | 0 | evasion-or-identity-guidance |
| `hinge-roses` | rewrite | reviewed | heavy | commercial | 653 | 3 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-standouts` | rewrite | reviewed | light | commercial | 659 | 4 | on | 0 | 0 | dynamic-pricing, absolute-claim |
| `hinge-subscription` | rewrite | reviewed | heavy | commercial | 933 | 5 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-verification` | rewrite | reviewed | light | other | 779 | 3 | on | 0 | 0 | absolute-claim |
| `how-does-facebook-dating-work` | rewrite | pending | heavy | other | 2713 | 4 | on | 0 | 3 | dynamic-pricing, algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `how-does-hinge-work-for-guys` | rewrite | pending | heavy | other | 2735 | 3 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim, quantitative-claim |
| `how-does-match-com-work` | rewrite | pending | heavy | other | 2525 | 5 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-does-tinder-work` | rewrite | reviewed | heavy | other | 1446 | 5 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `how-many-free-likes-on-hinge` | rewrite | reviewed | light | other | 571 | 5 | on | 0 | 0 | dynamic-pricing, absolute-claim |
| `how-to-ask-her-out-over-text` | rewrite | pending | light | evergreen | 2661 | 4 | on | 0 | 3 | absolute-claim |
| `how-to-cancel-tinder-gold` | rewrite | reviewed | light | other | 636 | 4 | on | 0 | 0 | none |
| `how-to-find-someone-on-hinge` | rewrite | pending | heavy | other | 2195 | 6 | on | 0 | 7 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-find-someone-on-tinder` | rewrite | pending | heavy | other | 3197 | 6 | on | 0 | 1 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-flirt-over-text` | rewrite | pending | heavy | evergreen | 3996 | 4 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `how-to-get-matches-on-tinder` | rewrite | pending | heavy | other | 2434 | 2 | on | 0 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `how-to-keep-a-conversation-going-over-text` | rewrite | pending | light | evergreen | 3010 | 4 | on | 0 | 3 | swipestats-data-claim, absolute-claim |
| `how-to-like-someone-on-hinge` | rewrite | reviewed | light | other | 651 | 5 | on | 0 | 0 | absolute-claim |
| `how-to-refresh-hinge` | rewrite | reviewed | heavy | other | 551 | 4 | on | 0 | 0 | algorithm-claim, evasion-or-identity-guidance |
| `how-to-reset-hinge` | rewrite | reviewed | heavy | algorithm-account | 800 | 5 | on | 0 | 0 | algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `how-to-reset-tinder` | rewrite | reviewed | heavy | algorithm-account | 1301 | 6 | off | 1 | 0 | algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `how-to-slide-into-dms` | rewrite | pending | light | evergreen | 2854 | 7 | on | 0 | 2 | swipestats-data-claim, absolute-claim |
| `how-to-talk-dirty` | rewrite | pending | heavy | evergreen | 3472 | 4 | on | 0 | 3 | absolute-claim, adult-content |
| `how-to-tell-if-she-likes-you-over-text` | rewrite | pending | heavy | evergreen | 2915 | 4 | on | 0 | 4 | algorithm-claim, absolute-claim |
| `how-to-text-a-guy-to-like-you` | rewrite | pending | light | evergreen | 2803 | 4 | on | 0 | 2 | swipestats-data-claim, absolute-claim |
| `how-to-text-a-woman` | rewrite | pending | light | evergreen | 2798 | 4 | on | 0 | 4 | absolute-claim |
| `how-to-use-hinge` | rewrite | reviewed | heavy | other | 1062 | 11 | off | 1 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `if-you-x-someone-on-hinge-what-happens` | rewrite | reviewed | light | other | 592 | 4 | on | 0 | 0 | none |
| `is-hinge-a-good-dating-app` | rewrite | pending | heavy | other | 2332 | 5 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim |
| `is-hinge-better-than-tinder` | rewrite | pending | heavy | other | 2045 | 6 | on | 0 | 0 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `is-hinge-x-worth-it` | rewrite | reviewed | heavy | commercial | 916 | 4 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `married-people-on-tinder` | rewrite | pending | heavy | other | 2152 | 5 | on | 0 | 0 | algorithm-claim, absolute-claim |
| `pick-up-lines-for-girls` | rewrite | pending | medium | evergreen | 3408 | 5 | on | 0 | 5 | first-person-claim, absolute-claim, weak-source-candidate |
| `pick-up-lines` | rewrite | reviewed | heavy | evergreen | 1735 | 4 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `tinder-boost` | rewrite | reviewed | light | commercial | 691 | 3 | on | 0 | 0 | dynamic-pricing, absolute-claim |
| `tinder-for-friends` | rewrite | pending | heavy | other | 2577 | 8 | on | 0 | 0 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `tinder-for-seniors` | rewrite | pending | heavy | other | 2188 | 8 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `tinder-platinum` | rewrite | reviewed | heavy | commercial | 1372 | 3 | off | 1 | 0 | swipestats-data-claim, algorithm-claim, absolute-claim |
| `tinder-questionnaire` | rewrite | pending | medium | other | 3085 | 4 | on | 0 | 0 | dynamic-pricing, swipestats-data-claim, absolute-claim |
| `tinder-shadowban` | rewrite | reviewed | heavy | algorithm-account | 840 | 5 | on | 0 | 0 | algorithm-claim, evasion-or-identity-guidance |
| `tinder-subscription` | rewrite | reviewed | heavy | commercial | 758 | 5 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `tinder-terms-and-conditions` | rewrite | pending | heavy | algorithm-account | 2210 | 7 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `what-does-rizz-mean` | rewrite | pending | light | evergreen | 2653 | 4 | on | 0 | 2 | absolute-claim |
| `what-to-text-your-crush` | rewrite | pending | light | evergreen | 2981 | 8 | on | 0 | 5 | first-person-claim, absolute-claim |
| `when-do-hinge-roses-reset` | rewrite | reviewed | light | algorithm-account | 424 | 2 | on | 0 | 0 | dynamic-pricing, absolute-claim |
| `who-should-text-first-after-a-date` | rewrite | reviewed | light | evergreen | 877 | 2 | on | 0 | 0 | absolute-claim |

## Dependency cycles

No cycles detected.

## Publication dependency order

This is a mechanical topological order only. Editorial priority and the final two-per-day calendar still need to be applied.

1. `ai-rizz-generator`
2. `best-conversation-starters-over-text`
3. `bumble-boost`
4. `bumble-premium`
5. `can-you-send-pics-on-hinge`
6. `does-hinge-automatically-update-your-location`
7. `double-texting`
8. `dry-texting`
9. `first-message-on-dating-app`
10. `good-morning-texts-for-her`
11. `flirty-texts-for-him`
12. `hinge-algorithm`
13. `hinge-ban`
14. `hinge-boost`
15. `hinge-match-note`
16. `hinge-most-compatible`
17. `hinge-notifications`
18. `hinge-phone-number`
19. `hinge-roses`
20. `hinge-standouts`
21. `hinge-subscription`
22. `hinge-verification`
23. `how-does-match-com-work`
24. `how-does-tinder-work`
25. `how-many-free-likes-on-hinge`
26. `how-to-cancel-tinder-gold`
27. `how-to-flirt-over-text`
28. `how-to-keep-a-conversation-going-over-text`
29. `how-to-like-someone-on-hinge`
30. `how-to-refresh-hinge`
31. `how-to-reset-hinge`
32. `how-does-hinge-work-for-guys`
33. `how-to-reset-tinder`
34. `how-to-slide-into-dms`
35. `how-to-talk-dirty`
36. `good-morning-messages-for-him`
37. `good-night-texts`
38. `flirty-emojis`
39. `how-to-tell-if-she-likes-you-over-text`
40. `break-up-text`
41. `how-to-text-a-guy-to-like-you`
42. `how-to-text-a-woman`
43. `how-to-ask-her-out-over-text`
44. `bumble-messaging`
45. `how-to-use-hinge`
46. `hinge-app-icons`
47. `hinge-opening-lines`
48. `hinge-conversation-starters`
49. `ai-text-message-generator`
50. `hinge-desktop`
51. `how-to-find-someone-on-hinge`
52. `if-you-x-someone-on-hinge-what-happens`
53. `is-hinge-a-good-dating-app`
54. `hinge-for-friends`
55. `is-hinge-better-than-tinder`
56. `is-hinge-x-worth-it`
57. `hinge-gift-card`
58. `hinge-or-bumble`
59. `married-people-on-tinder`
60. `pick-up-lines`
61. `chat-up-lines`
62. `cheesy-pick-up-lines`
63. `pick-up-lines-for-girls`
64. `tinder-boost`
65. `how-to-get-matches-on-tinder`
66. `tinder-for-friends`
67. `tinder-for-seniors`
68. `how-does-facebook-dating-work`
69. `tinder-platinum`
70. `tinder-questionnaire`
71. `tinder-shadowban`
72. `how-to-find-someone-on-tinder`
73. `tinder-subscription`
74. `free-messaging-dating-sites`
75. `tinder-terms-and-conditions`
76. `what-does-rizz-mean`
77. `dirty-pick-up-lines`
78. `what-to-text-your-crush`
79. `flirty-gifs`
80. `when-do-hinge-roses-reset`
81. `who-should-text-first-after-a-date`
