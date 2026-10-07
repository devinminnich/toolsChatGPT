# Fitness Coach — training and private history sync

Mobile-first training PWA in toolsChatGPT. The repository root builds the Home Renovation Planner.

## Run and verify

Requires Node 22.12+.

```sh
cd apps/fitness
npm ci
npm run dev
npm test
npm run build
```

GitHub Pages publishes the app at `/toolsChatGPT/fitness/`.

## Training

Built-in/custom exercises, independent set targets and types, saved routines, active-session recovery, floating rest timer, difficulty capture, user-confirmed local progression, completed history, Excel imports and routine share links are available. JSON backup export preserves local data. Dumbbell loads are per hand; volume counts recorded load × reps. Warm-up load changes preserve the original working weight. Deleting a routine retains performed history.

Shared plans can use `?plan=<published-slug>` or inline `#routine=<base64url-json>`. Detailed imports preserve set types, starting loads, rep/time ranges, rest and exercise notes. Repeated IDs do not overwrite saved edits. Planned workouts are separate from performed history.

## Private cloud history and ChatGPT coach

Settings offers account sign-in and optional automatic completed-history sync. Enable it on the browser containing your existing results to upload that history. Reopen the app after an offline workout to finish pending uploads. Another signed-in device can retrieve completed history; routine templates, drafts and active sessions remain local.

The read-only Fitness Coach MCP connection lets a separately authorized ChatGPT coaching project retrieve actual completed results. It makes no OpenAI model calls and requires no OpenAI API key. The in-workout coach panel still supports a manual chat handoff and local next-set suggestions. Voice, nutrition, notifications and full program sync remain future work.

See [COACH_CONNECTION.md](COACH_CONNECTION.md) for the deployed MCP URL, one-time Supabase Auth settings, connection steps, permissions and validation boundaries. At implementation time OAuth was disabled; native authorization must be configured before connecting ChatGPT. Do not claim the user connection is complete until sign-in, authorization and a real results retrieval succeed.

Local-only routines/drafts require a backup before clearing browser storage. Completed cloud rows are append-only; first upload per session ID wins. Each browser is bound to one syncing account to protect local results against accidental cross-account uploads.

## Browser checks

```sh
npx playwright install chromium
npm run test:e2e
npm run test:offline
```

Phone checks use Chromium emulation. Physical iOS Safari sign-in, authorization and background behavior require device validation.
