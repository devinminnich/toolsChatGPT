# iTry build status

## Implemented prototype

The repository contains a responsive interactive web prototype for the core iTry experience and a Chrome/Edge Manifest V3 gift-helper extension prototype.

Web surfaces demonstrate upcoming occasions, people/relationship labels, private budgets, explainable gift recommendations, possible-duplicate warnings, Autopilot controls, the hard spending ceiling, the mandatory veto concept, optional private preferences, learning/privacy controls, and the private delivery-profile concept.

The extension is deliberately user-initiated in this build: it can save Love it / Something like this / Already own it / Not interested from the active page to local extension storage. It does not request broad browsing-history permission.

A Supabase-ready RLS schema is included under `supabase/001_itry_schema.sql`. The only Supabase project visible to the build tooling predates iTry and may belong to another tool, so this build does not mutate that database without explicit designation.

Amazon/retailer commerce is represented by the architecture, but the prototype does not fabricate provider access or payment credentials. Real catalog, affiliate, and direct-purchase flows require provider enrollment/credentials.

GitHub Actions is configured to run the production TypeScript/Vite build for `apps/itry` changes using Node 22.
