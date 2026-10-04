# Prototype security review

- No service-role or secret Supabase key is included in client code.
- Environment template expects only project URL and publishable client key.
- Proposed exposed tables have RLS enabled and owner/participant predicates.
- Preference evidence and giver settings use separate ownership boundaries.
- Extension proof of concept does not request browser history permission and reads the active page only after an explicit user action.
- Autopilot decision logic treats the hard maximum as non-bypassable and duplicate risk as non-automatic.
- No payment credentials, Amazon credentials, or fabricated commerce tokens are committed.

Before production launch, rerun database security/performance advisors on the dedicated iTry project, test RLS as multiple users, add server-side recommendation/fulfillment authorization, encrypt sensitive fulfillment data appropriately, and complete payment/provider threat modeling.
