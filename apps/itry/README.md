# iTry

iTry is a consent-first gifting assistant that remembers important occasions, learns gift-relevant preferences with minimal user effort, and helps people choose thoughtful gifts.

## Product promise

**Remember who matters, when they matter, and what they may genuinely appreciate.**

Core loop:

`Connect -> Learn -> Remember -> Recommend -> Explain -> Approve -> Purchase -> Deliver`

## V1 product decisions

- Anyone can create an account.
- Registered users connect by mutual acceptance; non-users can exist as private contacts and later be linked.
- Each user privately defines their relationship to a connection.
- Common occasions and custom important dates are supported.
- Gift budgets, recommendations, purchasing activity, and Autopilot limits are private to the giver.
- Recipients can maintain a private delivery profile; connections can send to it without seeing the underlying address.
- A browser extension passively learns gift-relevant shopping interests only after explicit consent.
- Extension feedback is optional and lightweight: **Love it**, **Something like this**, **Already own it**, **Not interested**.
- A private preference dashboard is optional; iTry should work without maintaining it.
- Users can globally pause preference learning.
- Sensitive browsing categories are excluded from collection.
- Connections never receive raw browsing/search history or source activity.
- Recommendations explain why a gift fits without exposing private activity.
- Duplicate ownership is an uncertainty warning, not a hard block.
- Autopilot is opt-in and configured by contact/occasion.
- Autopilot has a hard do-not-exceed amount; over-limit purchases require explicit approval.
- In-limit Autopilot purchases always provide a veto window before purchase.
- No recipient gift-rating system.
- Consumers are free in the initial model; iTry monetizes completed gifting transactions.
- Recommendation ranking must remain relevance-first; vendors cannot simply buy the top recommendation.

## V1 scope

1. Accounts and profiles.
2. Connections and private non-user contacts.
3. Private relationship labels.
4. Common and custom occasions.
5. Per-contact and per-occasion gift budgets.
6. Browser extension and consent state.
7. Passive gift-interest signal extraction.
8. Lightweight explicit preference signals.
9. Optional private preference dashboard.
10. Global Pause Learning control.
11. Recommendation generation and privacy-safe explanations.
12. Duplicate-risk warnings.
13. Physical-product catalog sources, initially including open-web/affiliate sources where permitted.
14. Private recipient delivery profiles.
15. Autopilot settings, spending ceiling, veto state, and approval state.
16. Transaction/affiliate attribution.

## Post-V1 vision

- Native iOS and Android apps.
- Experiences, tickets, restaurants, travel, subscriptions, and services.
- Group gifting.
- Merchant self-service onboarding/catalog management.
- Merchant analytics.
- More retailer integrations.
- Personalized fulfillment such as engraving and advanced gift presentation.

See `docs/technical-architecture.md` for the proposed architecture and implementation sequence.
