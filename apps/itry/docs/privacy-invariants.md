# iTry Privacy Invariants

1. A connected user can never retrieve another user's raw browsing/search events, URLs, query text, or source timestamps.
2. Recommendations are the disclosure boundary: giver gets the item plus an abstract reason, not private evidence.
3. Relationship labels, budgets, Autopilot limits, gift intents and purchase activity are giver-private.
4. Connections cannot enumerate each other's networks.
5. A giver can use a recipient's preferred fulfillment destination without gaining address visibility solely from the connection.
6. Duplicate warnings are coarse and never identify another giver or private evidence.
7. Preference collection requires the subject user's informed action/consent; production passive-learning designs require a dedicated privacy/security review before implementation.
8. Pause/disable controls must stop any enabled background learning immediately.
9. Sensitive contexts are excluded from preference inference.
10. Data minimization favors normalized preference evidence over raw activity.
11. No timeout can authorize Autopilot spend above the effective hard maximum.
12. Every in-limit Autopilot purchase has a veto period; explicit approval can complete it sooner.
13. Material changes to item, price, quantity, merchant or fulfillment invalidate stale authorization.
14. Recipients are not required to score gifts.
15. Vendor economics cannot bypass relevance and appropriateness rules.
