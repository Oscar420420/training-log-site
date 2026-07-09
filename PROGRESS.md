# Training Log — Progress

Read this file at the start of every session before making changes.

## Stack

- React + Vite (`@vitejs/plugin-react`)
- IndexedDB via `idb`, wrapped in `src/db.js`
- PWA via `vite-plugin-pwa` (manifest + service worker, `autoUpdate`)
- `react-router-dom` (`HashRouter` — chosen over `BrowserRouter` because the
  app is meant to be hosted as a static site with no server-side rewrite
  rules; hash routing avoids 404s on deep-link refresh)
- No backend, no login, single local user, no sync between devices
- Deployed via GitHub Actions (`.github/workflows/deploy.yml`) to GitHub
  Pages at `/training-log-site/` (Pages source must be set to "GitHub
  Actions" in repo settings, not "Deploy from a branch")

## Data model (IndexedDB, db name `training-log`, version 1)

```
blocks     { id, name, createdAt }
weeks      { id, blockId, weekNumber, createdAt }              index: blockId
days       { id, weekId, name, createdAt }                     index: weekId
exercises  { id, dayId, name, normalizedName, createdAt }      index: dayId, normalizedName
sets       { id, exerciseId, createdAt,
              targetRepsMin, targetRepsMax, targetRPE, targetRestSeconds,
              weight, reps, rpe, completed }                  index: exerciseId
```

- `id` = `crypto.randomUUID()`.
- `normalizedName` = `name.trim().toLowerCase()`, used to match the same
  exercise across weeks/days for the comparison feature.
- Each set carries both a coach-authored **target** (`targetRepsMin/Max`,
  `targetRPE`, `targetRestSeconds`) and the **actual** logged result
  (`weight`, `reps`, `rpe`, `completed`). `reps`/`rpe` are pre-filled from
  the target when a set is created (or when its target is edited, as long
  as it isn't marked `completed` yet — see `updateSetTarget` in `src/db.js`),
  so training mode always starts from "what the plan says" and only needs
  weight (or a quick override) to become "what actually happened".
- Deleting a parent cascades to all descendants (see `deleteBlock`,
  `deleteWeek`, `deleteDay`, `deleteExercise` in `src/db.js`).
- Schema changes need a version bump + `upgrade()` migration in `src/db.js`
  only when adding/removing object stores or indexes — this project has so
  far only added plain fields to the `sets` records, which doesn't require
  a version bump (IndexedDB records are schemaless beyond keyPath/indexes).
  Still, treat this as the one costly-to-change area and confirm before
  restructuring it.

## What's built

1. **Navigation & CRUD** — full hierarchy: Blocks (`/`) → Weeks
   (`/blocks/:blockId`) → Days (`/blocks/:blockId/weeks/:weekId`) → Exercises
   (`.../days/:dayId`) → Sets (`.../exercises/:exerciseId`). Add/rename/delete
   at every level. Sticky header shows breadcrumb + current level title.
   Delete cascades and confirms first.
2. **Persistence** — every add/edit/delete writes straight to IndexedDB via
   `src/db.js`; verified surviving a full page reload.
3. **Comparison feature** — on the exercise screen (`ExercisePage.jsx` +
   `ComparisonPanel.jsx`), a toggle above the set table (train mode only):
   - **Last week**: same exercise name in `weekNumber - 1` of the same block,
     preferring the same day name, falling back to any day in that week.
   - **Best week**: scans every week in the block for the same exercise name
     and picks the week with the highest **total volume**
     (Σ weight × reps). If the exercise appears on more than one day in the
     winning week, the single highest-volume occurrence is shown (not merged).
   Logic and rationale are documented in comments above
   `getLastWeekComparison` / `getBestWeekComparison` in `src/db.js`.
4. **Polish**:
   - Numeric keypad (`inputMode="numeric"/"decimal"`) for numeric inputs.
   - Quick-add: adding a new week whose number is exactly one more than an
     existing week offers (via confirm dialog) to copy that previous week's
     day + exercise names (not sets/weights) into the new week
     (`copyWeekStructure` in `src/db.js`).
   - Big tap targets (44px+ buttons/inputs) mobile-first layout, max-width
     640px centered column for desktop.
5. **Coach mode / Train mode** — a global toggle in the header
   (`src/ModeContext.jsx`, persisted to `localStorage`) that changes what the
   exercise screen shows:
   - **Coach mode**: prescribe each set individually — rep range (e.g.
     `8-12`), target RPE, target rest (minutes). Sets can be added/removed
     here. This is the "programming" view.
   - **Train mode**: log today's session — each set row is pre-filled with
     its target reps/RPE (muted "target …" hint shown under the field) and
     you fill in the actual weight (and can override reps/RPE if the set
     didn't go as planned). A checkmark circle marks a set done. The
     Last week/Best week comparison panel is shown above the table.
   - Visual style reskinned to a near-black/dark-navy + blue palette
     (inspired by MyStrengthBook) with lettered badges (A/B/C…) on exercise
     rows, replacing the earlier slate/sky-blue palette.
   - Deliberately *not* built yet: an actual rest countdown timer (target
     rest is stored/shown as text only), and gating structural CRUD
     (add/rename/delete Blocks/Weeks/Days/Exercises) behind the mode toggle
     — both were explicitly deferred per user decision.

All features have been manually exercised end-to-end with a headless
browser (add block → week → day → exercise → sets, reload to confirm
persistence, cross-week comparison with real data, quick-add copy, coach
mode set prescription → train mode pre-fill → log weight → reload) — not
just built, but verified working.

## Known simplifications / not done

- No cross-device sync (explicit non-goal) — each browser/device has its own
  local IndexedDB data. A manual export/import (JSON) was discussed as a
  possible stopgap but not yet built.
- No charts/analytics beyond last-week/best-week (explicit non-goal).
- No rest-timer countdown (explicit non-goal for this pass; target rest is
  stored and shown as text next to the set).
- No automated test suite (Vitest/RTL) yet — verification so far has been
  manual/scripted browser exercising, not committed test files.

## Next steps (nothing currently blocking)

- Consider installing the app on a real phone and confirming the "Add to
  Home Screen" flow and offline behavior end-to-end.
- Possible follow-ups raised but not yet requested: a real rest countdown
  timer; export/import JSON for moving data between devices; gating
  structural edits behind coach mode.
