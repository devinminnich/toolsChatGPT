# iTry build status

## Working prototype

The repository now contains a responsive interactive web prototype for the core iTry experience plus a Chrome/Edge Manifest V3 gift-helper extension prototype.

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

## Deliberately not connected to the existing Supabase project

The only Supabase project currently visible to the build tooling predates iTry and may belong to another tool. iTry therefore does not mutate that project's database. The schema is ready to apply once iTry has a dedicated backend or the existing project is explicitly designated for iTry.

## External integrations

Amazon/retailer commerce is represented in the architecture but not hard-coded with fake credentials or unsupported checkout APIs. Real catalog and transaction integrations require provider enrollment/credentials.

## Test target

Run from `apps/itry`:

```sh
npm install
npm run dev
npm run build
```

The app is designed as an isolated Vite workspace so it does not modify the existing renovation or fitness apps.
