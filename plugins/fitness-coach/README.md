# Fitness Coach in ChatGPT

This plugin renders the same React workout app as the standalone Fitness Coach, with an added AI Coach tab. The AI is the active ChatGPT conversation; no separate OpenAI API key or background AI service is required.

## Connect privately

1. Complete the one-time Supabase OAuth configuration in `apps/fitness/COACH_CONNECTION.md`. OAuth is currently disabled in the existing project, so installation is blocked until its owner completes dashboard sign-in and enables it.
2. In ChatGPT on the web, open Plugins, add a custom MCP server, name it Fitness Coach, choose OAuth, and use the URL in `mcp.json`. Create it as a plugin. This package can also be used as a portable Agent Plugins source where the client supports Git-backed plugin packages.
3. Sign into the Fitness Coach account and choose **Allow workout app & AI Coach**. Read-only history consent cannot use the training UI. Existing read-only grants remain read-only.
4. In a new conversation with Fitness Coach selected, ask “Open my Fitness Coach workout app.” Use **Expand workout app** for a larger view.
5. Open **AI Coach** and ask for a workout, progress review, or next-set recommendation. ChatGPT calls `get_training_context`, then `propose_coach_advice`. Replies appear in the conversation and the coach inbox. Refresh replies if needed. Apply or dismiss each proposed change.

Synced completed history is loaded automatically. To bring existing device-only routines and an active session, export a backup from the standalone app and import that JSON in the plugin's Settings. Existing account items win on duplicate IDs. Do this on the device/browser that holds the original routines.

## What is included

Today, workout builder, built-in and custom exercises, independent working/warm-up/drop sets, previous results, difficulty feedback, local next-set guidance, rest timer, progress recovery, history/metrics, scheduling, Excel workout import, settings, backup import/export, and AI Coach. The plugin uses account storage through MCP, not iframe IndexedDB. The UI bundle is self-contained and needs no direct network domains. OAuth credentials remain with the host.

The AI Coach responds to user requests in ChatGPT. Timers use an absolute end time so an inactive iframe can recover the correct remaining duration. Background sound, voice logging, file downloads and native mobile host behavior depend on host capabilities and require testing after installation; this does not claim continuous background coaching. A model response is not considered applied until the user presses the UI's apply button.

State saves use revision compare-and-swap. Concurrent views receive a conflict instead of silently overwriting each other. Completed history remains append-only. Coach set proposals include exact previous values; completed, skipped or subsequently edited sets reject stale adjustments. Immediate undo is available for the last applied AI set adjustment while that coach panel remains mounted.

## Build and deploy

`npm run build` in `apps/fitness` builds the standalone app and the self-contained `dist/plugin-ui.html`. `scripts/build-plugin.mjs` also generates Edge Function copies of shared domain code from the same source; never edit `supabase/functions/fitness-coach/generated` directly. GitHub Pages serves the widget artifact. The Edge Function serves that fixed artifact as the MCP UI resource, caches it for one minute, and returns no private data in public resource discovery.

Deploy the migration and the `fitness-coach` Edge Function with all generated domain dependencies. Keep gateway `verify_jwt=false` because OAuth discovery/resources are public and tool calls implement verified bearer authentication plus per-user/client consent and database RLS. The server never uses a service-role client.

Local validation includes TypeScript/build, shared domain/API tests, and desktop/phone browser tests with a simulated MCP Apps host. Live RLS checks verify direct access, train consent, read-only rejection, cross-user isolation, revocation, append-only history, and concurrent-save rollback. Actual authenticated ChatGPT/iOS testing remains pending the OAuth connection.
