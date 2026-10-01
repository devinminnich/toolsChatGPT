# Fitness Coach — V1 product specification and architecture

Status: Discovery complete; implementation specification.
Date: 2026-09-30.
Working name: Fitness Coach (final branding remains open).
Repository: devinminnich/toolsChatGPT.

## 1. Product outcome and decisions

A mobile-first fitness and nutrition PWA that turns conversation into actual workouts, training programs, food logs and household meal plans. Every core action also has a manual interface. The differentiator is fast exercise discovery and an adaptive coach that knows the user's confirmed goals, equipment and history.

Initially one user; data ownership supports additional accounts later. On September 30, the user revised the original no-login choice: email/password is acceptable when easier to maintain. Use Supabase Auth with persistent sessions. No custom device-pairing system.

OpenAI powers V1. Maintain our own exercise catalog. Use external authoritative nutrition data, supplemented by clearly labeled estimates and custom foods. Provide original illustrations and written exercise instructions initially.

The entire agreed feature set remains V1, delivered in usable milestones. Social/community features, native iOS, Apple Health, wearables, retailer carts/product links and demonstration videos are deferred.

## 2. Navigation and screens

Phone navigation: Today, Train, Nutrition, Progress, Coach. Settings and the calendar are reachable from Today; Coach is also available from each relevant screen. Preserve the active workout when navigating elsewhere.

| Screen | Essential behavior |
|---|---|
| Onboarding | Goals, experience, schedule, units, equipment/location, limitations, nutrition, household and store; skip optional steps |
| Today | Scheduled workout, readiness check-in, meals, daily nutrition totals, sync state |
| Train | Saved workouts, programs, exercise search, create manually or with Coach |
| Exercise detail | Instructions, illustration, setup/form cues, muscles, substitutions and personal history |
| Workout builder | Reorder, group, edit targets/rest, save template, schedule; show Coach edits in the same editor |
| Active workout | Large weight/reps controls, previous performance, complete set, rest timer, difficulty, voice and Coach |
| Calendar | Workouts and meals, move/replace/shorten sessions, review proposed schedule adjustments |
| Nutrition | Food search, portions, frequent meals, recipes, text/voice/photo logging, targets and daily totals |
| Meal planner | Household portions, leftovers, cooking constraints, review meals and consolidated groceries |
| Progress | Body weight, measurements/photos, PRs, estimated 1RM, volume, frequency, muscle volume and nutrition adherence |
| Coach | Persistent conversation, actionable drafts, clarification, explanations and action history |
| Settings | Goals, locations, household, store, units, Coach involvement/autonomy, notifications, export/delete and account |

Desktop uses a sidebar and multi-column workspace for building programs, analytics, calendars and meal planning. All features remain accessible on phone and desktop. No required hover interactions. Aim for 44px or larger touch controls, readable contrast and accessible labels.

## 3. Exercise catalog and search

Seed a curated catalog covering common barbell, dumbbell, cable, machine, bodyweight, mobility and cardio exercises. Proposed first milestone target: at least 100 reviewed records. Each record has stable ID, name, aliases, primary/secondary muscles, equipment requirements, movement pattern, difficulty, instructions, setup, form cues, mistakes, metric definition, illustration provenance and substitutions.

Allow unlimited private custom exercises, editable through forms or conversation. Archive used exercises rather than breaking historical references. Equipment includes capacity and increments when known: dumbbell maximum, available plates, machine increments and units.

Search ranks exact names, aliases and partial matches. Filters include muscle/region, equipment, movement pattern, compound/isolation, experience, location, favorites and previously performed. Natural language converts into validated filters and ranked catalog results; Coach must use existing IDs or explicitly create a custom exercise.

Unknown gym equipment stays unconfirmed. Photos, gym/location lookup, pasted lists, voice and checkboxes create an editable inventory. Confirm photo recognition and gym assumptions before using them as reliable availability. Support Home, Gym and Travel locations; match exercises to the active location.

Acceptance: typing "chest" exposes relevant results and equipment filters immediately; "dumbbell chest" excludes cable-only exercises; custom exercises participate in search and workouts.

## 4. Workouts, programs and logging

Templates and program prescriptions are separate from performed sessions. Starting a session snapshots the planned exercises and targets. Coach adjustments update uncompleted targets, while completed sets remain factual history.

Manual routines use Workout → Exercise → ordered Set targets. Each planned set owns its weight, reps (or time/distance target), and type. Users add, remove and reorder individual sets. An exercise retains its between-set rest setting. Starting a workout snapshots each set individually; changing session values or types does not rewrite the saved routine. Existing exercise-wide targets migrate into equivalent independent sets without changing performed history.

Support weight/reps, duration, distance, bodyweight, added/assisted load, calories, pace and heart rate. Store measurement units explicitly and convert at the display boundary. Weight must distinguish total bar load, per-dumbbell weight, assistance and machine-stack labels; ask when ambiguous. Missing metrics are unknown, never zero.

Support warm-up/working/drop/failure sets, AMRAP, supersets, circuits and intervals. Group structure and rest placement are explicit. Log actual outcomes separately from targets, including partial/skipped sets, difficulty, optional RPE/RIR and notes. Cardio and bodyweight progress must not use incompatible lifting formulas.

Prefill next targets and show previous comparable performance. Complete Set persists locally before network work, starts the appropriate timer and exposes Easy / About right / Hard / Failed. Timers use an absolute end timestamp so app suspension does not reset them. Users can adjust, skip, pause, resume and finish early.

Voice identifies the active exercise/set and parses the report. If the user says "ten at fifty" with clear context, log once with an immediate correction action. Ambiguous units, exercise or set prompt for confirmation. Explicit user commands remain separate from Coach autonomy settings.

Programs include weeks, scheduled sessions, progression and deload rules. Calendar entries reference planned session instances. Moving one session should not silently rewrite the template or entire program. Proposed missed-workout shifts and travel/time-constrained alternatives are previewable and reversible.

## 5. Coach involvement, authority and progression

Separate involvement (Minimal / Coach / Highly engaged) from autonomy (Suggest only / Adapt within limits). Default proposal: Coach involvement and Suggest only until the user chooses otherwise. Per-action permissions allow finer control.

| Action | Policy |
|---|---|
| Change upcoming load, reps or rest | Suggest or apply according to autonomy settings and configured bounds |
| Add/remove a warm-up or introduce a drop set | Only within enabled permissions and experience/goal constraints |
| Replace exercise, substantially add volume, extend time or change session focus | Ask first |
| Change goals, dietary targets or overall program | Explicit user confirmation; never silent |
| Change completed history | Only direct user correction, with an audit trail |

Proactive coaching is event-driven after a completed set or relevant readiness response. Avoid repeated questions when recent difficulty is sufficient. One short check-in by default; ask more only when uncertainty matters. Pause prompts while the user is performing a set. Optional spoken coaching requires an enabled audio setting.

Before sessions, offer energy, soreness, sleep and available-time check-in. Coach can propose shorter sessions or travel modifications while preserving the underlying program.

Progression combines actual performance, difficulty, experience, goals, recent volume, readiness and equipment increments. Use deterministic constraints to validate AI suggestions: finite nonnegative metrics, actual available load steps, permitted volume/time bounds and no edits to completed sets. Do not force increases after every easy set. With insufficient history, request difficulty or retain conservative targets.

Record the reason, evidence IDs, previous/new targets and decision time for each applied adjustment. "Why?" retrieves this record; explanations must not invent evidence.

Pain reports interrupt progression for that movement. Ask useful clarification, recommend stopping the painful movement and offer an appropriate alternative when possible. No diagnosis or rehabilitation claims. Remember confirmed limitations. Professional evaluation advice is appropriate for concerning or persistent symptoms. Coach should not encourage pushing through pain.

## 6. Nutrition, recipes and household planning

Food sources: propose USDA FoodData Central for generic/branded search, with custom foods and provider provenance. Missing foods can use an editable estimate. Store basis quantity/unit, portion conversions, calories/protein/carbs/fat, provider IDs, source date and whether values are database-derived, user-entered or estimated.

Manual, conversational, voice and photo logging all produce the same food-entry structure. Photo analysis proposes candidate foods, portion estimates and uncertain ingredients. Ask about meaningful unknowns such as serving size and cooking oil. Confirm before adding estimates to totals; users can correct later. Present uncertainty honestly rather than suggesting exact photo-derived values.

Nutrition targets are user-approved, versioned by date and distinct for each household member. A child profile can use normal meal portions without a dieting target. Keep allergies, dislikes and preferences structured and enforce them before meal suggestions.

Recipes have ingredients, quantities, instructions, cooking method, yield and nutrition calculation provenance. Household servings and leftovers are explicit: three dinner portions plus two lunch portions are five planned portions, with individual allocation when targets differ. Editing yield recalculates ingredients and portions. Scheduled meals do not become consumed food logs automatically.

Meal planning workflow: constraints → proposed meals/portions → user edits/approval → calendar → consolidated grocery list. Normalize compatible ingredient units, sum across meals and subtract known pantry quantities. Show recipe quantity separately from suggested package count. Do not merge incompatible ingredients.

Store preference includes chain, exact branch/address and optional store ID. Product recommendations retain source URL internally, checked time, package size and verification status. V1 displays product names and quantities. Recommend a store-specific product only with current reliable source evidence. When inaccessible, retain the generic ingredient and state that product availability is unverified. Never fabricate stock or price. No purchase/cart action in V1.

## 7. Architecture and repository integration

Existing repository inspection: root app is the Home Renovation Planner, built with React/TypeScript/Vite; GitHub Pages deployment currently builds its root dist folder. Fitness must have an independent app boundary.

Proposed layout:
- apps/fitness/: independent React/TypeScript/Vite package, PWA assets and tests
- apps/fitness/src/domain/: exercises, sessions, progression, nutrition and calendar rules
- apps/fitness/src/features/: screen-specific UI
- apps/fitness/src/data/: local cache/outbox and cloud adapters
- apps/fitness/supabase/migrations/: fitness schema and RLS
- apps/fitness/supabase/functions/: Coach, transcription/vision and food/product integration
- docs/fitness-app-specification.md: this document

First implementation uses an independent package and build commands; repository-wide workspace conversion can wait. Use pinned dependencies and a lockfile. Add fitness CI scoped to its paths. A separately configured frontend deployment avoids changing the planner's current Pages artifact. Deployment provider selection and credentials remain setup work, not completed infrastructure.

Backend: Supabase Postgres, Auth, private Storage and server functions. OpenAI and external API credentials stay in backend secrets; never frontend build variables or committed files. Client uses its user session; backend verifies identity and ownership on every action. Apply RLS to all private tables. Household profiles belong to the account; they are not login accounts initially.

Use a dedicated fitness Supabase project or isolated schema only after selecting the target; do not apply fitness migrations to the renovation database by assumption. No paid resources have been provisioned by this specification.

## 8. Data model and invariants

| Domain | Proposed entities |
|---|---|
| Identity/profile | fitness_profiles, coach_settings, goals, confirmed_preferences |
| Equipment | training_locations, equipment_catalog, location_equipment |
| Exercises | exercises, exercise_aliases, exercise_equipment, exercise_substitutions, favorites |
| Planning | workout_templates, template_exercises, set_prescriptions, programs, program_weeks, scheduled_sessions |
| Performance | workout_sessions, session_exercises, set_results, readiness_checkins |
| Nutrition | nutrition_targets, foods, food_portions, food_entries, recipes, recipe_ingredients |
| Household/plans | household_members, dietary_constraints, meal_plans, planned_meals, portion_allocations |
| Groceries | grocery_stores, grocery_lists, grocery_items, verified_product_candidates |
| Progress/media | body_measurements, private_media |
| Agent/operations | coach_threads, coach_messages, proposed_actions, action_events, notification_preferences, device_subscriptions |

All owned records have owner_id, UUID, created_at, updated_at and revision where mutable. Enforce ownership across related records, not merely at the parent. Shared catalog rows are read-only to ordinary users; custom entries are private.

Completed sets store actual outcomes and original targets. Program/template edits do not rewrite sessions. Nutrition entries snapshot confirmed nutrient values so provider updates cannot change past totals. Derived PR/volume/1RM summaries can be recomputed; show estimated 1RM as an estimate with its method.

## 9. Agent action pipeline

Client input → authenticated server → relevant confirmed profile/current session/history → OpenAI tool request → schema validation → ownership + authority + domain constraints → proposed or applied action → structured result/UI update.

Tools include search_exercises, get_history, create_workout, modify_upcoming_set, log_set, create_program, propose_schedule_change, update_equipment, search_foods, propose_food_entry, log_food, create_meal_plan, generate_grocery_list and explain_action.

Use typed schemas and explicit tool handlers; no arbitrary SQL/database access for the model. Manual UI and Coach call the same domain operations. A model's permission claim is not authority.

Each mutation carries operation ID and expected revision. Retry returns the same result, preventing duplicate set/food entries. Stale actions are rejected and refreshed. Approval is bound to the actual proposed change and expires after conflicting edits. Multi-record actions are transactional.

Do not run paid AI calls on every timer tick. Trigger on meaningful events and use concise contextual history. Track usage, enforce configurable request limits and expose unavailable/retry states. ChatGPT consumer subscription access is not the application's API credential.

## 10. Persistence, privacy and notifications

Cache active workout/catalog locally in IndexedDB. Queue edits with idempotency IDs; show Pending / Synced / Needs attention. Refresh/reopen resumes locally saved work. Synchronize revisions and surface conflicts instead of overwriting the other device. AI/network outages leave manual logging operational.

Private photos use owner-scoped storage and short-lived signed access; do not cache private media in the public service worker. Validate uploads and strip unnecessary metadata where practical. Progress photos are user-managed, private and deletable. Profile memory can be inspected/corrected. Export/delete covers structured logs and private uploads.

Notifications are opt-in by category, configurable with quiet hours. Workout, meal and nutrition prompts use the user's timezone. Verify iOS PWA capabilities on the actual device during hardening; foreground reminders remain usable if push permission/support is absent. Offline notifications must not be represented as guaranteed.

## 11. Build milestones and completion checks

| Milestone | Deliverable | Completion check |
|---|---|---|
| 1 — Training foundation | Independent app shell, onboarding/settings, catalog/search, custom exercises, manual builder, active workout/timers, local persistence | On phone, find an exercise, save a workout, complete sets, refresh mid-session and resume without loss |
| 2 — Cloud and history | Supabase login, RLS/storage, sync/outbox, exercise/session history, PRs, measurements/photos | Same account sees saved workout on desktop; unauthorized account cannot read it; retry cannot duplicate a set |
| 3 — Adaptive Coach | OpenAI tools, persistent confirmed profile, AI builder, readiness, between-set proposals/adaptation, explanations and voice | Conversation edits actual workout; denied actions stay blocked; ambiguous voice asks; applied changes show reasons |
| 4 — Programs and calendar | Multi-week programs, progression/deloads, planned sessions, rescheduling and configurable reminders | Move a session, shorten today's workout and resume the original program afterward |
| 5 — Nutrition | Food search/manual/text/voice/photo logs, recipes, targets, household meal plans, groceries and verified product names | Confirm a photo estimate; plan household dinners/leftovers; consolidated quantities match approved recipes |
| 6 — V1 hardening | Advanced exercise metrics/groups, analytics completeness, offline/accessibility/mobile review, privacy/export/delete | Full agreed scope matrix passes on iPhone and desktop; planner build remains healthy |

Advanced metric/set structures exist from milestone 1 even if all execution UIs arrive later. Intermediate milestones are usable increments; V1 is complete only after every agreed feature is delivered. No timeline estimate or finished app is implied by this document.

First implementation task: create apps/fitness with the responsive shell and independent scripts; add domain schemas and seeded catalog; implement exercise search → manual workout → persistent active session. This establishes the actual data that Coach will later operate on.

## 12. Validation plan and setup dependencies

Meaningful domain tests cover unit conversions, exercise equipment matching, recipe scaling, progression constraints, forbidden Coach actions, immutable completed sets, idempotent retries and revision conflicts. Integration tests cover RLS and private storage. End-to-end tests cover phone logging/resume, desktop planning, Coach proposal acceptance and household meal/grocery flow. Avoid tests that merely repeat static UI content.

Before cloud-enabled release: select Supabase project, configure email/password and RLS, choose frontend hosting, install server-side OpenAI/food API credentials and verify notification delivery. These are remaining configuration tasks. Local manual training should be usable without AI credentials.

## 13. Primary implementation references

- Supabase anonymous sign-ins and their cross-device limitations (reviewed while evaluating the original no-login proposal): https://supabase.com/docs/guides/auth/auth-anonymous
- OpenAI function calling for controlled application actions: https://developers.openai.com/api/docs/guides/function-calling
- USDA FoodData Central API guide: https://fdc.nal.usda.gov/api-guide/

These sources inform integration choices; all application workflows, authority settings and milestones above are product design decisions.

### Single-user coaching discovery (September 30, 2026)

For this prototype, the assistant in the existing ChatGPT conversation doubles as Devin's AI coach. Bring actual workout feedback to that conversation and use the resulting exchanges to refine the future service scope. The app's timer and coach entry stay pinned during scrolling. The initial handoff copies the user's question plus goal, units, exercise names/equipment, ordered set targets/results, set types and difficulty. It does not imply the assistant can automatically read private device storage.

Future in-app chat should provide the same context directly to a secured AI service, keep a session conversation, ask about missing equipment increments or pain/recovery context, explain proposed changes, and return structured next-set proposals. Apply only to explicitly identified unfinished targets, reject stale proposals after a manual edit or set completion, and preserve completed outcomes and saved routines. Define automatic adaptation separately from suggestion-only behavior; the prototype supports a session-level Auto-adjust next set toggle, off by default. When enabled, selecting difficulty applies the bounded next-set change once per completed source set. Repeated clicks do not stack increases. Native AI chat and cloud credentials are required before production release.

Initial local suggestion rules are a discoverable prototype, not a substitute for the conversational coach: Easy may suggest one rep or a confirmed small weight increment according to goal, About right/Hard hold, Failed does not increase targets. Users can override all unfinished targets. Warm-up/drop/timed sets and deliberate routine progression are excluded from automatic recommendations.
