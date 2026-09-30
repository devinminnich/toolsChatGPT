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
- 122 built-in exercise records, aliases, muscle/equipment filters and written instructions.
- Private custom exercises with reps, time or distance metrics.
- Manual workout builder with ordered exercises and independent set weight, reps/time/distance and Working/Warm-up/Drop type.
- Add, remove and reorder routine sets; edit set types during a workout. Existing routines migrate automatically without changing history.
- Automatic recovery of unfinished workout drafts.
- Active sessions: prefilled set controls, completion, difficulty, skip/restore and manual corrections.
- Absolute-time rest timer, pause/resume, extend and skip.
- IndexedDB persistence, save/error status and active-session recovery.
- Previous comparable set results, completed workout history and logged load/reps volume.
- Unit conversion for saved templates; each performed session retains its original units.
- JSON backup export.
- Excel template download, browser-only upload validation and set preview before adding completed workouts.
- Workout import links and duplicate protection.
- Production service worker caches the shell/assets for reopening without connectivity.

The catalog uses common movement instructions plus specific cues. It does not yet include illustrations, demonstration videos or an external professional review. Warm-up/drop/working types are editable per set. Superset and circuit grouping is upcoming.

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

## Excel workout import

In Settings, download the Excel template. Fill B4 with workout name, B5 with date (YYYY-MM-DD), and B6 with lb or kg. Starting at row 10, enter one completed set per row with exercise name, set number, weight and reps. Supported names and aliases are listed on Exercises. Saved custom rep exercises are also accepted by exact name. Use 0 for bodyweight and per-hand load for dumbbells. Number sets from 1 per exercise without gaps. Keep the template title and headers in place.

Upload the .xlsx in Settings, review the preview, then choose Add to history. Cancel leaves history unchanged. Invalid rows are rejected with row numbers. Files are parsed locally and limited to 2 MB, 30 exercises and 50 sets per exercise. Identical contents generate a stable ID so reimporting cannot create duplicates. Imported workouts retain date and unit; time, duration and difficulty are unspecified. Desktop imports remain on that browser until cloud sync is implemented.
