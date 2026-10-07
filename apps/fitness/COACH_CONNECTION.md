# Fitness Coach connection

The app saves locally first. Completed history can be synced into private Supabase rows. A read-only MCP endpoint exposes results to an explicitly authorized ChatGPT coach. Routine templates, drafts and active sessions remain device-local. No OpenAI API key or model call is needed.

## Deployment

Database: existing project `rhiqlmgswblmbripzevd`.

Migration: `supabase/migrations/20261007001751_fitness_history_and_coach_access.sql`.

Edge function: `supabase/functions/fitness-coach/` (deploy with JWT gateway verification disabled; tool calls validate the caller with Supabase Auth and check explicit consent before querying). The function uses the caller's bearer token and RLS, never a service-role client. Metadata is public; completed results are private.

MCP URL:

`https://rhiqlmgswblmbripzevd.supabase.co/functions/v1/fitness-coach/mcp`

## One-time Supabase Auth configuration

The connected Supabase MCP tools cannot change Auth configuration. OAuth was observed disabled during deployment. Configure the following in the project's dashboard:

1. Authentication → URL Configuration: allow `https://devinminnich.github.io/toolsChatGPT/fitness/` as an email redirect URL. Keep the existing Site URL unless needed to configure the consent destination.
2. Authentication → OAuth Server: enable OAuth 2.1 and configure the Authorization Path so the combined Site URL + Authorization Path resolves exactly to `https://devinminnich.github.io/toolsChatGPT/fitness/`. If the Site URL is `https://devinminnich.github.io`, the path is `/toolsChatGPT/fitness/`. If the Site URL is `https://devinminnich.github.io/toolsChatGPT`, use `/fitness/`. Verify the resulting destination before connecting. Do not choose a destination in another application.
3. For personal ChatGPT setup, either enable dynamic client registration or pre-register the ChatGPT OAuth client using the exact redirect URI supplied by ChatGPT and configure its client ID in the connection. Dynamic registration lets clients register, but does not grant access: each user must approve read-only workout access.

No `openid` scope or ID token is required. Workout access is enforced by RLS and per-user/per-client consent rows, independently of OIDC profile scopes.

## Connect your phone and coach

1. On the phone/browser containing your existing history, open Fitness Coach → Settings.
2. Create a Fitness Coach account or sign in. This is separate from your Supabase dashboard login. If confirmation is enabled, confirm the email and sign in here.
3. Enable **Sync my completed workouts automatically**. This uploads existing finished and imported results, plus future completed results. Wait for the synced count.
4. In ChatGPT on the web, open Plugins → Add custom MCP server. Name it **Fitness Coach**, paste the MCP URL above, and select OAuth authentication.
5. Sign in to the same Fitness Coach account and approve **Allow read-only coach access**.
6. Install/select the plugin in your coaching project. Ask it to retrieve completed workouts and report the most recent session to verify the connection.

Project instruction addition:

> Before recommending a workout or progression, use Fitness Coach's `list_completed_workouts` to retrieve my latest actual results. Use `get_workout_results` for details. Follow pagination when comparing older sessions. Unlogged/skipped sets are not performed results; missing difficulty means unknown. Dumbbell loads are per hand. If access fails or history is empty, tell me and ask me to check Settings → Cloud sync. Do not invent results or claim data was synced without tool evidence.

## Boundaries and revocation

- Only finished/imported history uploads. Normal logging and rest timers work while offline.
- Uploads retry on reconnect, when the page becomes visible and once per minute while open. iOS cannot guarantee background sync after the app is closed; reopen it to finish pending uploads.
- History rows are append-only: the first uploaded copy of a session ID wins. Editing a routine cannot change performed history. Backup import/finished-result editing remain separate future features.
- Another device can download completed history after signing into the same account and enabling sync. Routine templates and in-progress sessions do not sync yet.
- A browser is bound to the first syncing account to prevent accidental upload of one person's local results into another account. Use a separate browser/profile for another account.
- Pausing uploads retains synced results. **Revoke all coach access** removes consent rows immediately, then revokes native OAuth grants. Existing tokens cannot read without a consent row.
- OAuth tokens cannot access the existing renovation workspace. Other future tables in this Supabase project must also define explicit OAuth policies before exposing data.

## Verification

Unit tests cover completed-history selection, date handling, deduplication, MCP discovery, authentication rejection, argument validation and set-result status. Live rolled-back SQL fixtures verify account isolation, read-only OAuth access, grant restrictions and revocation. Metadata and unauthenticated HTTP responses were checked live. User sign-in, OAuth authorization and real workout retrieval require the user's one-time setup above and have not been verified end-to-end until that is completed.
