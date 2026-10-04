# iTry

iTry remembers important occasions and helps people give thoughtful gifts using privacy-protected preference signals.

## Prototype

The current build is an isolated responsive Vite/React application under `apps/itry`, plus a user-initiated Chrome/Edge gift-helper extension.

Core loop: `Connect -> Learn -> Remember -> Recommend -> Explain -> Approve -> Purchase -> Deliver`

### Run the web prototype

```sh
cd apps/itry
npm install
npm run dev
```

Production verification:

```sh
npm run build
```

### Try the extension

Load `apps/itry/extension` as an unpacked extension in Chrome/Edge Developer Mode. The prototype reads the active page only when the user deliberately chooses one of the four preference actions.

## Product contract

- Anyone can join.
- Connections require acceptance; non-users can exist as private contacts.
- Relationship labels are privately defined by each user.
- Common and custom occasions are supported.
- Budgets, recommendations, gift activity, and Autopilot limits are private to the giver.
- Recipient preference evidence remains private to the recipient.
- Recommendations explain the fit without exposing browsing/search activity.
- Duplicate ownership is a warning, not a manual-purchase block.
- Autopilot is opt-in, has a hard spending maximum, and always includes a veto window.
- Above-limit purchases require explicit approval.
- Recipients can maintain a private delivery profile without disclosing their address to connections.
- No recipient gift-rating flow.
- iTry monetizes successful gifting transactions rather than attention.

## Build documents

- `docs/technical-architecture.md` — architecture and implementation sequence.
- `docs/privacy-invariants.md` — non-negotiable privacy boundaries.
- `docs/prototype-test-plan.md` — acceptance checks.
- `docs/build-status.md` — current implementation status and external blockers.
- `supabase/001_itry_schema.sql` — RLS-first schema ready for a dedicated iTry Supabase backend.

## Next production integrations

A production launch still requires a dedicated backend environment plus credentials/enrollment for real catalog and commerce providers. The prototype does not invent Amazon access or payment credentials.
