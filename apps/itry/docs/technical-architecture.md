# iTry Technical Architecture

## Goal
Prove the core loop before native apps or a large merchant platform: capture consented gift preferences, remember occasions, keep giver/recipient data separated, recommend explainably, and enforce Autopilot limits.

## Stack
- React + TypeScript + Vite responsive web app.
- Supabase Auth/Postgres/RLS for production identity and data.
- Chrome/Edge Manifest V3 helper first; native clients later.
- Privileged recommendation/commerce operations belong server-side.

## Privacy boundaries
- Recipient preference evidence is recipient-private.
- Givers receive recommendations and abstract reasons, never raw evidence.
- Giver relationship labels, budgets, Autopilot settings, intents and purchases are giver-private.
- Connections cannot enumerate each other's networks.
- Delivery addresses are not disclosed solely because users are connected.
- Duplicate detection returns only a coarse warning.
- Autopilot cannot exceed its hard maximum by timeout.

## Core entities
`profiles`, `connections`, `connection_preferences`, `private_contacts`, `occasions`, `preference_signals`, `delivery_profiles`, `catalog_items`, `recommendations`, `gift_intents`, `autopilot_runs`, `transactions`.

## Recommendation pipeline
Candidate generation considers recipient preferences, occasion, the giver's private relationship label, budget, catalog availability, ownership/duplicate indicators and delivery feasibility. Explicit positive/negative signals outweigh weak inferred interest. Explanations describe fit without identifying the private source.

## Commerce provider capabilities
Catalog providers should declare capabilities rather than pretending every retailer supports the same flow: `search`, `affiliate_link`, `direct_checkout`, `autopilot_purchase`, `delivery_estimate`, `gift_wrap`, `personalization`.

## Autopilot state machine
`candidate -> veto_pending -> approved_by_timeout | explicitly_approved | vetoed | approval_required -> purchase_pending -> purchased | failed | cancelled`

Rules:
- Feature and contact/occasion must be opted in.
- In-limit candidates require a veto window.
- Above-limit candidates require explicit approval.
- Possible duplicates do not auto-purchase.
- Material item/price/merchant changes invalidate stale authorization.
- Purchase execution must be idempotent and auditable.

## Build sequence
1. Prototype UI and privacy contract.
2. Dedicated backend, auth, connections, contacts, occasions, budgets.
3. Consented preference helper and private preference aggregation.
4. Catalog provider interface and recommendation ranking.
5. Affiliate/external checkout and gift intents.
6. Direct-commerce provider plus Autopilot veto/approval workflow.
7. Production security, RLS, abuse, commerce and end-to-end testing.

## Core acceptance scenario
Two users connect. The recipient deliberately supplies gift-interest signals. The giver sees an upcoming occasion and sets a private relationship/budget. iTry recommends relevant gifts with privacy-safe explanations. The giver cannot see underlying evidence. A possible duplicate is warned but remains manually selectable. An in-limit Autopilot candidate enters veto pending; an above-limit candidate cannot purchase without explicit approval.
