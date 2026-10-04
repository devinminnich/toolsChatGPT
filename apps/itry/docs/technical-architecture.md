# iTry Technical Architecture

## 1. Architecture goals

The first implementation should prove the distinctive iTry loop before adding native applications or a large merchant platform:

1. Capture consented gift-relevant preference signals.
2. Maintain private recipient preference profiles.
3. Remember occasions and giver-specific budgets.
4. Generate explainable recommendations without leaking source activity.
5. Support purchase attribution and a safe Autopilot state machine.

Privacy boundaries are architectural requirements, not UI conventions.

## 2. Proposed stack

Use the repository's existing TypeScript/React/Vite/Supabase direction where practical.

### Web application

- React + TypeScript + Vite.
- Responsive phone/desktop UI.
- Supabase Auth for account identity.
- PostgreSQL via Supabase for application data.
- Row Level Security (RLS) as the primary user-data access boundary.
- Server/Edge Functions for privileged recommendation, commerce, and notification operations.

### Browser extension

- Chromium Manifest V3 first (Chrome/Edge).
- TypeScript.
- Extension authenticated to the user's iTry account using a short-lived session/token flow.
- Content scripts detect product/shopping context locally where possible.
- Only normalized gift-interest events should be sent to the backend; raw page history should not be the default stored artifact.
- Extension UI exposes consent state, Pause Learning, and four optional feedback actions.

### Future clients

Native iOS/Android clients should consume the same backend domain APIs and privacy model rather than owning separate business logic.

## 3. Domain model

### `profiles`

- `id` (auth user id)
- `display_name`
- `birth_date` (privacy-controlled)
- `learning_enabled`
- timestamps

### `connections`

Represents an accepted relationship between two registered users.

- `id`
- `requester_id`
- `recipient_id`
- `status`: pending / accepted / removed / blocked
- timestamps

Relationship labels do not belong here because they are private and directional.

### `connection_preferences`

Giver-owned settings for another person.

- `owner_user_id`
- `connection_id`
- `private_relationship_label`
- `typical_budget_min`
- `typical_budget_max`
- `autopilot_enabled`
- `autopilot_max`
- `veto_window_hours`

The other connected user must never be able to read these fields.

### `private_contacts`

Non-user contacts owned by one user.

- `id`
- `owner_user_id`
- `display_name`
- `private_relationship_label`
- optional occasion/contact metadata
- optional future `linked_profile_id`

### `occasions`

- `id`
- `subject_profile_id` or `private_contact_id`
- `owner_user_id` where occasion is private/custom
- `occasion_type`
- `title`
- date/recurrence rule
- visibility policy

Common dates can be profile-derived; relationship-specific/custom dates remain private to the creator unless explicitly shared.

### `occasion_gift_settings`

- `owner_user_id`
- `occasion_id`
- optional budget overrides
- optional Autopilot override
- optional Autopilot max override

### `preference_signals`

Private to the subject user.

- `id`
- `subject_user_id`
- `signal_type`: product_view / repeated_interest / category_interest / love / similar / owns / negative
- normalized category/product/brand descriptors
- confidence
- recency/decay metadata
- source class (extension, explicit, first-party)
- timestamps

Avoid retaining full URLs/query text when a normalized signal is sufficient. Sensitive categories must be rejected before persistence.

### `preference_topics`

Derived private preference model.

- `subject_user_id`
- normalized topic/category/brand
- confidence
- positive/negative/ownership indicators
- last_evidence_at

### `delivery_profiles`

Recipient-owned encrypted/privileged fulfillment information.

Connections receive only a capability such as `preferred_delivery_available=true`; they do not receive address fields.

### `catalog_items`

Normalized representation of products available for recommendation.

- source/provider
- external id
- title/description
- taxonomy/tags
- price/currency
- availability/freshness
- image/link metadata
- fulfillment metadata
- affiliate/merchant attribution

### `recommendations`

Giver-facing recommendation artifact.

- giver id
- recipient/profile/contact id
- occasion id
- catalog item id
- rank/score
- privacy-safe explanation
- duplicate-risk state
- generated timestamp/expiry

Do not expose raw preference evidence through this table/API.

### `gift_intents`

Tracks selection without disclosing it to the recipient or other connections.

- giver
- recipient
- occasion
- selected item
- status
- duplicate-risk acknowledgement

### `autopilot_runs`

State machine:

`candidate -> veto_pending -> approved_by_timeout | explicitly_approved | vetoed | approval_required -> purchase_pending -> purchased | failed | cancelled`

No purchase transition is permitted if price exceeds the effective hard maximum without explicit approval.

### `transactions`

- giver
- recipient/occasion references
- provider/merchant
- amount
- attribution/commission metadata
- order state
- no payment secrets

## 4. Privacy and trust boundaries

1. Preference signals are recipient-private.
2. Givers can query recommendations, never underlying evidence.
3. Giver budgets and Autopilot settings are giver-private.
4. Gift intents/purchases are hidden from the recipient until normal fulfillment makes disclosure necessary.
5. One giver cannot see another giver's intent. Duplicate detection returns only a coarse warning such as `possible_duplicate`.
6. Delivery addresses are not returned to connections.
7. Sensitive-category filtering occurs before signal persistence.
8. Pause Learning prevents new passive signals from being accepted.
9. Deleting/clearing preference data must be supported as a first-class account operation.
10. Server-side functions, not clients, perform privileged recommendation joins and fulfillment address resolution.

## 5. Recommendation pipeline

V1 should use a deterministic/scored pipeline before relying heavily on opaque ML.

### Candidate generation

- recipient preference topics/signals
- occasion type
- giver's private relationship label
- budget/range
- catalog availability
- ownership/duplicate indicators

### Example scoring dimensions

- explicit `Love it` signal: very high positive weight
- repeated recent product/category interest: high weight
- `Something like this`: category/style positive weight, exact-item lower weight
- `Already own it`: exact/similar product penalty + duplicate warning
- `Not interested`: strong negative weight
- relationship/occasion appropriateness
- budget fit
- delivery feasibility before occasion
- catalog quality/freshness

### Explanation generation

Explanations must use abstracted reasons, e.g.:

> Strong match with their recent interests and the kind of gear they tend to prefer.

Never:

> They searched for this product seven times on Amazon last Tuesday.

## 6. Browser extension event flow

1. User installs extension.
2. User signs into iTry and explicitly enables learning.
3. Extension determines whether the current page is shopping/product relevant.
4. Sensitive/excluded contexts are rejected locally where feasible.
5. Extension extracts normalized product/category/brand signals.
6. Backend validates consent and filtering again.
7. Signal is persisted/aggregated.
8. Optional unobtrusive UI: `iTry noticed this` with four feedback actions.
9. Global Pause Learning immediately stops passive event submission.

V1 should not attempt unrestricted collection of complete browser history.

## 7. Commerce model

Create a provider abstraction so recommendation sources and purchase capabilities differ cleanly.

A catalog provider declares capabilities such as:

- `search`
- `affiliate_link`
- `direct_checkout`
- `autopilot_purchase`
- `delivery_estimate`
- `gift_wrap`
- `personalization`

External retailers can therefore participate in recommendations even when iTry cannot execute checkout. Direct iTry merchants can later support the full Autopilot path.

## 8. Autopilot safeguards

- Explicit global feature consent before any contact can enable Autopilot.
- Explicit per-contact/per-occasion enablement.
- Hard maximum amount.
- Mandatory veto window for in-limit purchases.
- Over-limit candidates enter `approval_required`; timeout can never authorize them.
- Material product/price/fulfillment changes during the veto window restart or invalidate approval.
- Possible-duplicate candidates should not auto-purchase; choose another candidate or request user action.
- Idempotency keys on purchase execution.
- Audit log for authorization and purchase state transitions.

## 9. Suggested V1 surfaces

### Web

- Onboarding/consent
- Home: upcoming occasions
- Connections/contacts
- Person detail: private relationship + budgets + occasions
- Recommendation detail with privacy-safe rationale
- Preference dashboard (optional)
- Delivery profile
- Autopilot settings and pending vetoes
- Privacy/Pause Learning

### Extension

- Signed-in/consent state
- Learning on/off
- Current-page detection state
- Love it / Something like this / Already own it / Not interested
- Link to private preference dashboard

## 10. Build sequence

### Phase 0 — Foundation

- Product/architecture docs.
- Create isolated `apps/itry` workspace.
- Define schemas/types and privacy invariants.

### Phase 1 — Social + occasions

- Auth/profile.
- Connections and private contacts.
- Relationship labels.
- Common/custom occasions.
- Upcoming-occasion dashboard.
- Budgets.

### Phase 2 — Preference engine

- Extension shell and consent.
- Product-page detection.
- Normalized signals.
- Explicit four-action feedback.
- Preference aggregation/dashboard.
- Pause Learning.

### Phase 3 — Recommendations

- Catalog provider interface.
- Seed/test catalog provider.
- Ranking pipeline.
- Explanation layer.
- Duplicate-risk inference.

### Phase 4 — Commerce

- Affiliate attribution/external checkout.
- Gift intents.
- Private delivery capability.
- Transaction records.

### Phase 5 — Autopilot

- Consent/settings.
- Candidate selection.
- Veto workflow.
- Approval-required workflow.
- Direct-purchase provider implementation only where contractually/technically supported.

### Phase 6 — Production hardening

- RLS/privacy tests.
- Abuse/security review.
- E2E tests for privacy leakage and Autopilot limits.
- Observability and purchase auditability.

## 11. Acceptance test for the core concept

A useful end-to-end prototype should demonstrate:

1. User A and User B connect.
2. User B enables extension learning.
3. B visits several mock/realistic shopping product pages; only normalized non-sensitive signals are recorded.
4. B optionally marks one item `Love it` and another `Already own it`.
5. A cannot view any of B's raw activity.
6. B's birthday appears on A's upcoming occasions.
7. A sets a private budget and relationship label.
8. iTry generates several relevant gift recommendations with privacy-safe explanations.
9. A sees a possible-duplicate warning where appropriate but can manually proceed.
10. An Autopilot candidate under the hard limit enters a veto window rather than purchasing immediately.
11. A candidate over the hard limit cannot purchase without explicit approval.

Passing this flow proves the central iTry proposition before adding group gifting, native apps, or a large merchant ecosystem.
