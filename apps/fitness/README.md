# Fitness Coach — training foundation

Independent mobile-first training PWA inside toolsChatGPT. The repository root still builds the Home Renovation Planner.

## Run

Requires Node 22.12+ (Node 24 also supported).

```sh
cd apps/fitness
npm ci
npm run dev
```

For production assets: `npm run build`. Serve `dist` over HTTPS to enable the service worker and installable PWA. Local preview: `npm run preview -- --host 127.0.0.1`. The frontend can be hosted in a subdirectory; assets use a relative base. The root GitHub Pages deployment publishes this app under `/toolsChatGPT/fitness/` alongside the renovation planner.

## Implemented

- Phone bottom navigation and desktop sidebar.
- Goal/unit/equipment preferences and stored settings for the upcoming Coach.
- 121 built-in exercise records, aliases, muscle/equipment filters and written instructions.
- Private custom exercises with reps, time or distance metrics.
- Manual workout builder, editable targets and exercise order.
- Automatic recovery of unfinished workout drafts.
- Active sessions: prefilled set controls, completion, difficulty, skip/restore and manual corrections.
- Absolute-time rest timer, pause/resume, extend and skip.
- IndexedDB persistence, save/error status and active-session recovery.
- Previous comparable set results, completed workout history and logged load/reps volume.
- Unit conversion for saved templates; each performed session retains its original units.
- JSON backup export.
- Production service worker caches the shell/assets for reopening without connectivity.

The catalog uses common movement instructions plus specific cues. It does not yet include illustrations, demonstration videos or an external professional review. Warm-up/drop/working set types exist in the data model; advanced group/type editing is upcoming.

## Current boundaries

This is an early training milestone, not the completed V1. No cloud login/sync, OpenAI calls, voice input, automatic progression, nutrition, programs or notifications are active. No API keys are required to use this milestone. Future Coach involvement/autonomy settings are labeled as upcoming.

Records are saved only in the current browser on the current device. Clearing browser storage deletes that copy. Export backups before clearing storage; backup import is not yet implemented. Offline reopening requires a previous online production visit and successful service worker installation.

For dumbbells, enter load per hand. Displayed volume is recorded load × reps, not combined bilateral load. Bands and bodyweight exercises have no external-load field in this slice. Session elapsed time measures wall-clock time, including breaks. Unit changes affect new sessions; history preserves original units.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:offline
```

Unit tests exercise search, prescription snapshots, duplicate completion, invalid values, unit conversion, historical comparability and IndexedDB recovery. Browser tests run the create/log/reload/finish flow and custom exercise persistence at desktop and phone viewports. The phone test uses Chromium emulation; physical iOS Safari validation remains required.

See ../../docs/fitness-app-specification.md for the full product and next milestones.
