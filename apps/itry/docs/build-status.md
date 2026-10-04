# iTry build status

## Working prototype

The repository contains a responsive interactive web prototype for the core iTry experience plus a Chrome/Edge Manifest V3 gift-helper extension prototype.

### Web prototype demonstrates
- Upcoming important occasion
- People and relationship labels
- Private budgets
- Gift recommendations and privacy-safe rationale
- Possible-duplicate warning
- Autopilot toggle and hard limit
- Mandatory-veto language
- Optional preference dashboard
- Learning/privacy control
- Private delivery-profile concept
- Extension-style preference feedback

### Extension prototype demonstrates
- User-initiated capture from the active page
- Love it / Something like this / Already own it / Not interested
- Local normalized preference signal
- No continuous raw browsing-history collection

### Backend package
- Supabase-ready schema included in `supabase/001_itry_schema.sql`
- RLS enabled for every exposed iTry table
- Giver-private budgets/settings and recipient-private preference signals modeled separately
- Environment template uses the modern Supabase publishable-key convention

## Backend connection status

The only Supabase project visible to the build tooling predates iTry and may belong to another tool, so the build does not mutate that database. The iTry schema is ready to apply when a dedicated iTry backend is selected.

## External integrations

Amazon/retailer commerce is represented in the architecture but not hard-coded with fake credentials or unsupported checkout APIs. Real catalog and transaction integrations require provider enrollment/credentials.

## Build verification

GitHub Actions runs the production TypeScript/Vite build for changes under `apps/itry`. From the app directory, local development uses `npm install`, `npm run dev`, and `npm run build`.

The app is isolated under `apps/itry` and does not modify the renovation or fitness application code.
