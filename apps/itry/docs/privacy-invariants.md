# iTry Privacy Invariants

These constraints are part of the product contract and should be enforced in schema/RLS/server boundaries and automated tests.

1. **No raw recipient browsing for givers.** A connected user can never retrieve another user's browsing/search events, raw URLs, query text, or source timestamps.
2. **Recommendations are the disclosure boundary.** A giver receives a recommended item plus an abstracted explanation, not the evidence used to infer it.
3. **Private giver settings stay private.** Relationship labels, budgets, Autopilot limits, veto behavior, gift intents, and purchase activity are readable only by the giver and privileged server functions.
4. **Connections cannot enumerate each other's network.** A connection does not imply access to the other user's connection list.
5. **Delivery address opacity.** A giver may learn that a preferred delivery destination exists, but does not receive its address fields solely because they are connected.
6. **Duplicate warnings are coarse.** The system may return `possible_duplicate`; it must not reveal which other person selected/purchased an item or the private evidence behind the warning.
7. **Learning requires consent.** Passive browser-derived signals are rejected unless learning is currently enabled for the subject user.
8. **Pause is authoritative.** Once learning is paused, new passive events are not persisted. Explicit user actions may be accepted only when clearly initiated by that user.
9. **Sensitive contexts are excluded.** Sensitive browsing categories are filtered before persistence and should not be used for gifting inference.
10. **Data minimization.** Store normalized preference evidence instead of complete browsing history whenever the normalized representation can serve the product purpose.
11. **Autopilot cannot exceed authorization.** No timeout or background process can authorize a purchase above the effective hard maximum.
12. **Autopilot always has a veto period.** An in-limit candidate is not an immediate purchase; the configured veto window must elapse or the giver must explicitly buy/approve sooner.
13. **Changed terms invalidate stale approval.** Material changes to item, price, quantity, merchant, or fulfillment after authorization require re-evaluation.
14. **Recipient feedback is not required.** iTry does not ask recipients to score gifts as a core recommendation-training mechanism.
15. **Commerce incentives cannot override relevance.** Paid/vendor status may be a catalog/business attribute but cannot bypass minimum relevance/appropriateness rules.
