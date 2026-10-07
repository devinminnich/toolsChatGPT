# Fitness Coach connection

The standalone app saves locally first and can sync completed history into private Supabase rows. The MCP endpoint also serves the full workout app inside ChatGPT with an AI Coach panel. The plugin saves profile, routines, drafts, active sessions and results to private account rows. Existing read-only coach grants remain read-only. ChatGPT itself coaches through the conversation; no separate OpenAI API key is required.

## Deployment

Database: existing project `rhiqlmgswblmbripzevd`.

Migrations: all files in `supabase/migrations/`, including the plugin training and consolidated insert policies.

Edge function: `supabase/functions/fitness-coach/` (deploy with JWT gateway verification disabled; tool calls validate the caller with Supabase Auth and check explicit consent before querying). The function uses the caller's bearer token and RLS, never a service-role client. Metadata is public; completed results are private.

MCP URL:

`https://rhiqlmgswblmbripzevd.supabase.co/functions/v1/fitness-coach/mcp`

## One-time Supabase Auth configuration

The connected Supabase MCP tools cannot change Auth configuration. OAuth was observed disabled during deployment. Configure the following in the project's dashboard:

1. Authentication → URL Configuration: allow `https://devinminnich.github.io/toolsChatGPT/fitness/` as an email redirect URL. Keep the existing Site URL unless needed to configure the consent destination.
2. Authentication → OAuth Server: enable OAuth 2.1 and configure the Authorization Path so the combined Site URL + Authorization Path resolves exactly to `https://devinminnich.github.io/toolsChatGPT/fitness/`. If the Site URL is `https://devinminnich.github.io`, the path is `/toolsChatGPT/fitness/`. If the Site URL is `https://devinminnich.github.io/toolsChatGPT`, use `/fitness/`. Verify the resulting destination before connecting. Do not choose a destination in another application.
3. For personal ChatGPT setup, either enable dynamic client registration or pre-register the ChatGPT OAuth client using the exact redirect URI supplied by ChatGPT and configure its client ID in the connection. Dynamic registration lets clients register, but does not grant access: each user must explicitly approve either read-only history access or workout app access.

No `openid` scope or ID token is required. Workout access is enforced by RLS and per-user/per-client consent rows, independently of OIDC profile scopes.

## Connect your phone and coach

1. On the phone/browser containing your existing history, open Fitness Coach → Settings.
2. Create a Fitness Coach account or sign in. This is separate from your Supabase dashboard login. If confirmation is enabled, confirm the email and sign in here.
3. Enable **Sync my completed workouts automatically**. This uploads existing finished and imported results, plus future completed results. Wait for the synced count.
4. In ChatGPT on the web, open Plugins → Add custom MCP server. Name it **Fitness Coach**, paste the MCP URL above, and select OAuth authentication.
5. Sign in to the same Fitness Coach account and approve **Allow workout app & AI Coach** for the full app, or **Allow read-only coach access** for history retrieval only.
6. Install/select the plugin in your coaching project. Ask “Open my Fitness Coach workout app.” Verify the latest actual completed session, then use the AI Coach panel to request a workout and review its proposal. See `plugins/fitness-coach/README.md` in the repository for package/install details.

If a connection was previously authorized read-only, revoke it before reconnecting for the broader workout-app consent; native OAuth may otherwise reuse the prior authorization. Nothing automatically upgrades existing consent rows.

Project instruction addition:

> Before recommending a workout or progression, use Fitness Coach's `list_completed_workouts` to retrieve my latest actual results. Use `get_workout_results` for details. Follow pagination when comparing older sessions. Unlogged/skipped sets are not performed results; missing difficulty means unknown. Dumbbell loads are per hand. If access fails or history is empty, tell me and ask me to check Settings → Cloud sync. Do not invent results or claim data was synced without tool evidence.

## Boundaries and revocation

- Only finished/imported history uploads. Normal logging and rest timers work while offline.
- Uploads retry on reconnect, when the page becomes visible and once per minute while open. iOS cannot guarantee background sync after the app is closed; reopen it to finish pending uploads.
- History rows are append-only: the first uploaded copy of a session ID wins. Editing a routine cannot change performed history. Backup import/finished-result editing remain separate future features.
- Another device can download completed history after signing into the same account and enabling sync. Standalone app routines and in-progress sessions stay device-local. The ChatGPT plugin's routines and active session use account storage. Export a standalone JSON backup and import it in plugin Settings to bring existing routines across once.
- A browser is bound to the first syncing account to prevent accidental upload of one person's local results into another account. Use a separate browser/profile for another account.
- Pausing uploads retains synced results. **Revoke all coach access** removes consent rows immediately, then revokes native OAuth grants. Existing tokens cannot read without a consent row.
- OAuth tokens cannot access the existing renovation workspace. Other future tables in this Supabase project must also define explicit OAuth policies before exposing data.

## Verification

Unit tests cover completed-history selection, date handling, deduplication, MCP discovery, authentication rejection, argument validation and set-result status. Live rolled-back SQL fixtures verify account isolation, read-only OAuth access, grant restrictions and revocation. Metadata and unauthenticated HTTP responses were checked live. User sign-in, OAuth authorization and real workout retrieval require the user's one-time setup above and have not been verified end-to-end until that is completed.

The plugin adds shared state and proposal validation, exact-before-value checks for set changes, UI resource metadata, app-only save tools, and desktop/phone tests with a simulated MCP Apps host. Live database fixtures additionally verify train consent, completed-history append, save revisions/concurrent conflict rollback, and grant revocation. Authenticated native ChatGPT/iOS testing still requires completing OAuth setup.
