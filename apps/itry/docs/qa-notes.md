# QA notes

The prototype's primary interaction paths are intentionally local and deterministic so the concept can be reviewed before external services are attached. The repository CI performs the production TypeScript/Vite build. Live multi-user, provider, payment and notification tests are deferred until their corresponding production services exist.

High-risk production QA areas are RLS cross-user leakage, delivery-address opacity, duplicate-warning privacy, Autopilot ceiling enforcement, stale authorization after price changes, purchase idempotency, refunds/cancellations, and retailer capability mismatches.
