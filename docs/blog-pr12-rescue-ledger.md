# PR #12 rescue review ledger

Generated from source commit `b3c341d312ac5edf89fda078b880c35a5670f2e0`. Re-run with `bun src/scripts/content/blog-pr12-rescue-audit.ts`.

This ledger is the explicit editorial decision surface for the 81 recovered posts. `rewrite` retains a post only after review. `pending` means the historical draft is not publication-ready; `reviewed` means its factual boundaries, sources, tone, dates, and CTA strategy received a manual pass.

## Inventory summary

- Recovered posts: **81**
- Total draft words: **70,745**
- Review decisions: **81 rewrite / 0 keep-as-is / 0 drop**
- Editorial status: **75 reviewed / 6 pending**
- Review tiers: {"heavy":30,"light":49,"medium":2}
- Editorial batches: {"algorithm-account":9,"commercial":11,"evergreen":31,"other":30}
- Unique in-batch link targets: **3**
- Dependency-orderable posts: **81**
- Posts in dependency cycles: **0**
- Missing internal targets after recovery: **0**

## Review decisions

| Slug | Decision | Status | Tier | Batch | Words | Sources | Auto CTA | Product cards | In-batch dependencies | Risk flags |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| `ai-rizz-generator` | rewrite | reviewed | light | evergreen | 1291 | 2 | off | 1 | 0 | absolute-claim |
| `ai-text-message-generator` | rewrite | reviewed | light | evergreen | 781 | 3 | off | 1 | 0 | absolute-claim |
| `best-conversation-starters-over-text` | rewrite | reviewed | light | evergreen | 1351 | 5 | off | 1 | 0 | none |
| `break-up-text` | rewrite | reviewed | medium | evergreen | 606 | 0 | on | 0 | 0 | none |
| `bumble-boost` | rewrite | reviewed | light | commercial | 671 | 3 | on | 0 | 0 | dynamic-pricing, absolute-claim |
| `bumble-messaging` | rewrite | reviewed | light | other | 807 | 5 | on | 0 | 0 | absolute-claim |
| `bumble-premium` | rewrite | reviewed | heavy | commercial | 1330 | 3 | off | 1 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `can-you-send-pics-on-hinge` | rewrite | reviewed | light | other | 584 | 4 | on | 0 | 0 | absolute-claim |
| `chat-up-lines` | rewrite | reviewed | light | evergreen | 658 | 3 | on | 0 | 0 | absolute-claim |
| `cheesy-pick-up-lines` | rewrite | reviewed | heavy | evergreen | 674 | 3 | on | 0 | 0 | algorithm-claim |
| `dirty-pick-up-lines` | rewrite | reviewed | heavy | evergreen | 479 | 2 | on | 0 | 0 | absolute-claim, adult-content |
| `does-hinge-automatically-update-your-location` | rewrite | reviewed | light | algorithm-account | 465 | 2 | on | 0 | 0 | none |
| `double-texting` | rewrite | reviewed | light | evergreen | 1060 | 3 | on | 0 | 0 | none |
| `dry-texting` | rewrite | reviewed | light | evergreen | 973 | 3 | on | 0 | 0 | absolute-claim |
| `first-message-on-dating-app` | rewrite | reviewed | light | evergreen | 1063 | 6 | on | 0 | 0 | none |
| `flirty-emojis` | rewrite | reviewed | light | evergreen | 602 | 3 | on | 0 | 0 | absolute-claim |
| `flirty-gifs` | rewrite | reviewed | light | evergreen | 562 | 3 | on | 0 | 0 | none |
| `flirty-texts-for-him` | rewrite | reviewed | light | evergreen | 628 | 3 | on | 0 | 0 | none |
| `free-messaging-dating-sites` | rewrite | reviewed | heavy | other | 550 | 5 | on | 0 | 0 | algorithm-claim |
| `good-morning-messages-for-him` | rewrite | reviewed | light | evergreen | 729 | 3 | on | 0 | 0 | absolute-claim |
| `good-morning-texts-for-her` | rewrite | reviewed | light | evergreen | 684 | 3 | on | 0 | 0 | none |
| `good-night-texts` | rewrite | reviewed | light | evergreen | 651 | 3 | on | 0 | 0 | none |
| `hinge-algorithm` | rewrite | reviewed | heavy | algorithm-account | 1235 | 4 | off | 1 | 0 | algorithm-claim |
| `hinge-app-icons` | rewrite | reviewed | light | other | 676 | 7 | on | 0 | 0 | absolute-claim |
| `hinge-ban` | rewrite | reviewed | heavy | algorithm-account | 706 | 4 | on | 0 | 0 | evasion-or-identity-guidance |
| `hinge-boost` | rewrite | reviewed | heavy | commercial | 859 | 3 | on | 0 | 0 | algorithm-claim, absolute-claim |
| `hinge-conversation-starters` | rewrite | reviewed | light | evergreen | 687 | 5 | on | 0 | 0 | none |
| `hinge-desktop` | rewrite | reviewed | light | other | 454 | 3 | on | 0 | 0 | absolute-claim |
| `hinge-for-friends` | rewrite | reviewed | light | other | 676 | 5 | on | 0 | 0 | absolute-claim |
| `hinge-gift-card` | rewrite | reviewed | light | commercial | 414 | 3 | on | 0 | 0 | none |
| `hinge-match-note` | rewrite | reviewed | light | other | 690 | 2 | on | 0 | 0 | none |
| `hinge-most-compatible` | rewrite | reviewed | light | other | 695 | 4 | on | 0 | 0 | none |
| `hinge-notifications` | rewrite | reviewed | light | other | 706 | 4 | on | 0 | 0 | none |
| `hinge-opening-lines` | rewrite | reviewed | light | evergreen | 713 | 3 | on | 0 | 0 | absolute-claim |
| `hinge-or-bumble` | rewrite | reviewed | heavy | other | 755 | 6 | on | 0 | 0 | algorithm-claim, absolute-claim |
| `hinge-phone-number` | rewrite | reviewed | heavy | algorithm-account | 464 | 4 | on | 0 | 0 | evasion-or-identity-guidance |
| `hinge-roses` | rewrite | reviewed | heavy | commercial | 653 | 3 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-standouts` | rewrite | reviewed | light | commercial | 659 | 4 | on | 0 | 0 | dynamic-pricing, absolute-claim |
| `hinge-subscription` | rewrite | reviewed | heavy | commercial | 933 | 5 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `hinge-verification` | rewrite | reviewed | light | other | 779 | 3 | on | 0 | 0 | absolute-claim |
| `how-does-facebook-dating-work` | rewrite | reviewed | light | other | 465 | 4 | on | 0 | 0 | none |
| `how-does-hinge-work-for-guys` | rewrite | pending | heavy | other | 2735 | 3 | on | 0 | 2 | dynamic-pricing, algorithm-claim, absolute-claim, quantitative-claim |
| `how-does-match-com-work` | rewrite | reviewed | heavy | other | 447 | 4 | on | 0 | 0 | algorithm-claim, absolute-claim |
| `how-does-tinder-work` | rewrite | reviewed | heavy | other | 1446 | 5 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `how-many-free-likes-on-hinge` | rewrite | reviewed | light | other | 571 | 5 | on | 0 | 0 | dynamic-pricing, absolute-claim |
| `how-to-ask-her-out-over-text` | rewrite | reviewed | light | evergreen | 568 | 3 | on | 0 | 0 | none |
| `how-to-cancel-tinder-gold` | rewrite | reviewed | light | other | 636 | 4 | on | 0 | 0 | none |
| `how-to-find-someone-on-hinge` | rewrite | reviewed | light | other | 536 | 4 | on | 0 | 0 | absolute-claim |
| `how-to-find-someone-on-tinder` | rewrite | reviewed | light | other | 552 | 4 | on | 0 | 0 | absolute-claim |
| `how-to-flirt-over-text` | rewrite | reviewed | light | evergreen | 605 | 3 | on | 0 | 0 | absolute-claim |
| `how-to-get-matches-on-tinder` | rewrite | pending | heavy | other | 2434 | 2 | on | 0 | 1 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `how-to-keep-a-conversation-going-over-text` | rewrite | reviewed | light | evergreen | 621 | 3 | on | 0 | 0 | first-person-claim, absolute-claim |
| `how-to-like-someone-on-hinge` | rewrite | reviewed | light | other | 651 | 5 | on | 0 | 0 | absolute-claim |
| `how-to-refresh-hinge` | rewrite | reviewed | heavy | other | 551 | 4 | on | 0 | 0 | algorithm-claim, evasion-or-identity-guidance |
| `how-to-reset-hinge` | rewrite | reviewed | heavy | algorithm-account | 800 | 5 | on | 0 | 0 | algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `how-to-reset-tinder` | rewrite | reviewed | heavy | algorithm-account | 1301 | 6 | off | 1 | 0 | algorithm-claim, evasion-or-identity-guidance, absolute-claim |
| `how-to-slide-into-dms` | rewrite | reviewed | heavy | evergreen | 518 | 2 | on | 0 | 0 | algorithm-claim |
| `how-to-talk-dirty` | rewrite | reviewed | heavy | evergreen | 473 | 3 | on | 0 | 0 | absolute-claim, adult-content |
| `how-to-tell-if-she-likes-you-over-text` | rewrite | reviewed | light | evergreen | 491 | 2 | on | 0 | 0 | none |
| `how-to-text-a-guy-to-like-you` | rewrite | reviewed | light | evergreen | 461 | 2 | on | 0 | 0 | none |
| `how-to-text-a-woman` | rewrite | reviewed | light | evergreen | 577 | 3 | on | 0 | 0 | absolute-claim |
| `how-to-use-hinge` | rewrite | reviewed | heavy | other | 1062 | 11 | off | 1 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `if-you-x-someone-on-hinge-what-happens` | rewrite | reviewed | light | other | 592 | 4 | on | 0 | 0 | none |
| `is-hinge-a-good-dating-app` | rewrite | reviewed | heavy | other | 751 | 7 | on | 0 | 0 | algorithm-claim, absolute-claim |
| `is-hinge-better-than-tinder` | rewrite | reviewed | light | other | 695 | 6 | off | 1 | 0 | absolute-claim |
| `is-hinge-x-worth-it` | rewrite | reviewed | heavy | commercial | 916 | 4 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `married-people-on-tinder` | rewrite | reviewed | light | other | 675 | 5 | on | 0 | 0 | none |
| `pick-up-lines-for-girls` | rewrite | reviewed | light | evergreen | 683 | 3 | on | 0 | 0 | absolute-claim |
| `pick-up-lines` | rewrite | reviewed | heavy | evergreen | 1735 | 4 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `tinder-boost` | rewrite | reviewed | light | commercial | 691 | 3 | on | 0 | 0 | dynamic-pricing, absolute-claim |
| `tinder-for-friends` | rewrite | pending | heavy | other | 2577 | 8 | on | 0 | 0 | dynamic-pricing, swipestats-data-claim, algorithm-claim, absolute-claim |
| `tinder-for-seniors` | rewrite | pending | heavy | other | 2188 | 8 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `tinder-platinum` | rewrite | reviewed | heavy | commercial | 1372 | 3 | off | 1 | 0 | swipestats-data-claim, algorithm-claim, absolute-claim |
| `tinder-questionnaire` | rewrite | pending | medium | other | 3085 | 4 | on | 0 | 0 | dynamic-pricing, swipestats-data-claim, absolute-claim |
| `tinder-shadowban` | rewrite | reviewed | heavy | algorithm-account | 840 | 5 | on | 0 | 0 | algorithm-claim, evasion-or-identity-guidance |
| `tinder-subscription` | rewrite | reviewed | heavy | commercial | 758 | 5 | off | 1 | 0 | algorithm-claim, absolute-claim |
| `tinder-terms-and-conditions` | rewrite | pending | heavy | algorithm-account | 2210 | 7 | on | 0 | 0 | dynamic-pricing, algorithm-claim, absolute-claim |
| `what-does-rizz-mean` | rewrite | reviewed | light | evergreen | 631 | 3 | on | 0 | 0 | none |
| `what-to-text-your-crush` | rewrite | reviewed | light | evergreen | 591 | 3 | on | 0 | 0 | none |
| `when-do-hinge-roses-reset` | rewrite | reviewed | light | algorithm-account | 424 | 2 | on | 0 | 0 | dynamic-pricing, absolute-claim |
| `who-should-text-first-after-a-date` | rewrite | reviewed | light | evergreen | 877 | 2 | on | 0 | 0 | absolute-claim |

## Dependency cycles

No cycles detected.

## Publication dependency order

This is a mechanical topological order only. Editorial priority and the final two-per-day calendar still need to be applied.

1. `ai-rizz-generator`
2. `ai-text-message-generator`
3. `best-conversation-starters-over-text`
4. `break-up-text`
5. `bumble-boost`
6. `bumble-messaging`
7. `bumble-premium`
8. `can-you-send-pics-on-hinge`
9. `chat-up-lines`
10. `cheesy-pick-up-lines`
11. `dirty-pick-up-lines`
12. `does-hinge-automatically-update-your-location`
13. `double-texting`
14. `dry-texting`
15. `first-message-on-dating-app`
16. `flirty-emojis`
17. `flirty-gifs`
18. `flirty-texts-for-him`
19. `free-messaging-dating-sites`
20. `good-morning-messages-for-him`
21. `good-morning-texts-for-her`
22. `good-night-texts`
23. `hinge-algorithm`
24. `hinge-app-icons`
25. `hinge-ban`
26. `hinge-boost`
27. `hinge-conversation-starters`
28. `hinge-desktop`
29. `hinge-for-friends`
30. `hinge-gift-card`
31. `hinge-match-note`
32. `hinge-most-compatible`
33. `hinge-notifications`
34. `hinge-opening-lines`
35. `hinge-or-bumble`
36. `hinge-phone-number`
37. `hinge-roses`
38. `hinge-standouts`
39. `hinge-subscription`
40. `hinge-verification`
41. `how-does-facebook-dating-work`
42. `how-does-match-com-work`
43. `how-does-tinder-work`
44. `how-many-free-likes-on-hinge`
45. `how-to-ask-her-out-over-text`
46. `how-to-cancel-tinder-gold`
47. `how-to-find-someone-on-hinge`
48. `how-to-find-someone-on-tinder`
49. `how-to-flirt-over-text`
50. `how-to-keep-a-conversation-going-over-text`
51. `how-to-like-someone-on-hinge`
52. `how-to-refresh-hinge`
53. `how-to-reset-hinge`
54. `how-does-hinge-work-for-guys`
55. `how-to-reset-tinder`
56. `how-to-slide-into-dms`
57. `how-to-talk-dirty`
58. `how-to-tell-if-she-likes-you-over-text`
59. `how-to-text-a-guy-to-like-you`
60. `how-to-text-a-woman`
61. `how-to-use-hinge`
62. `if-you-x-someone-on-hinge-what-happens`
63. `is-hinge-a-good-dating-app`
64. `is-hinge-better-than-tinder`
65. `is-hinge-x-worth-it`
66. `married-people-on-tinder`
67. `pick-up-lines`
68. `pick-up-lines-for-girls`
69. `tinder-boost`
70. `how-to-get-matches-on-tinder`
71. `tinder-for-friends`
72. `tinder-for-seniors`
73. `tinder-platinum`
74. `tinder-questionnaire`
75. `tinder-shadowban`
76. `tinder-subscription`
77. `tinder-terms-and-conditions`
78. `what-does-rizz-mean`
79. `what-to-text-your-crush`
80. `when-do-hinge-roses-reset`
81. `who-should-text-first-after-a-date`
