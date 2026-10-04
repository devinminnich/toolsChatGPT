# Architecture decisions

- **Separate app workspace:** iTry lives under `apps/itry` to avoid coupling to the renovation and fitness tools.
- **Responsive web first:** validates the product loop before native mobile maintenance.
- **Manifest V3 helper:** Chrome/Edge proof of concept; active-page capture is user initiated in this prototype.
- **Supabase planned backend:** fits the repository stack and supports Auth/Postgres/RLS, but no unrelated existing project is mutated without explicit designation.
- **RLS-first ownership:** preference evidence belongs to the recipient; budgets/gift intent belong to the giver.
- **Provider capabilities:** catalog discovery and automatic purchase are modeled as separate capabilities.
- **Autopilot as state machine:** a purchase is never represented as a simple boolean because veto, explicit approval, failure, and cancellation are meaningful states.
