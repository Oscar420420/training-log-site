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

## Data model (IndexedDB, db name `training-log`, version 1)

```
blocks     { id, name, createdAt }
weeks      { id, blockId, weekNumber, createdAt }              index: blockId
days       { id, weekId, name, createdAt }                     index: weekId
exercises  { id, dayId, name, normalizedName, createdAt }      index: dayId, normalizedName
sets       { id, exerciseId, weight, reps, rpe, notes, createdAt }  index: exerciseId
```

- `id` = `crypto.randomUUID()`.
- `normalizedName` = `name.trim().toLowerCase()`, used to match the same
  exercise across weeks/days for the comparison feature.
- Deleting a parent cascades to all descendants (see `deleteBlock`,
  `deleteWeek`, `deleteDay`, `deleteExercise` in `src/db.js`).
- Schema changes need a version bump + `upgrade()` migration in `src/db.js`
  — this is the one place that's costly to change, so confirm before editing.

## What's built

1. **Navigation & CRUD** — full hierarchy: Blocks (`/`) → Weeks
   (`/blocks/:blockId`) → Days (`/blocks/:blockId/weeks/:weekId`) → Exercises
   (`.../days/:dayId`) → Sets (`.../exercises/:exerciseId`). Add/rename/delete
   at every level. Sticky header shows breadcrumb + current level title.
   Delete cascades and confirms first.
2. **Persistence** — every add/edit/delete writes straight to IndexedDB via
   `src/db.js`; verified surviving a full page reload.
3. **Comparison feature** — on the exercise screen (`ExercisePage.jsx` +
   `ComparisonPanel.jsx`), a toggle above the set-logging form:
   - **Last week**: same exercise name in `weekNumber - 1` of the same block,
     preferring the same day name, falling back to any day in that week.
   - **Best week**: scans every week in the block for the same exercise name
     and picks the week with the highest **total volume**
     (Σ weight × reps). If the exercise appears on more than one day in the
     winning week, the single highest-volume occurrence is shown (not merged).
   Logic and rationale are documented in comments above
   `getLastWeekComparison` / `getBestWeekComparison` in `src/db.js`.
4. **Polish**:
   - Numeric keypad (`inputMode="numeric"/"decimal"`) for week number,
     weight, reps, RPE.
   - Quick-add: adding a new week whose number is exactly one more than an
     existing week offers (via confirm dialog) to copy that previous week's
     day + exercise names (not sets/weights) into the new week
     (`copyWeekStructure` in `src/db.js`).
   - Dark theme throughout (fixed dark palette, not a toggle — this is a gym
     log, not meant to be used in bright-white mode).
   - Big tap targets (44px+ buttons/inputs) mobile-first layout, max-width
     640px centered column for desktop.

All four features have been manually exercised end-to-end with a headless
browser (add block → week → day → exercise → sets, reload to confirm
persistence, cross-week comparison with real data, quick-add copy) — not
just built, but verified working.

## Known simplifications / not done

- No light-mode toggle (dark only, by design per spec).
- No cross-device sync (explicit non-goal).
- No charts/analytics beyond last-week/best-week (explicit non-goal).
- Editing a set uses a single "weight x reps" text field (e.g. `80x8`) in the
  rename modal rather than separate weight/reps inputs — quick to type, but
  could be split into two fields later if that's annoying in practice.
- No automated test suite (Vitest/RTL) yet — verification so far has been
  manual/scripted browser exercising, not committed test files.

## Next steps (nothing currently blocking)

- Consider installing the app on a real phone and confirming the "Add to
  Home Screen" flow and offline behavior end-to-end (only verified the
  manifest/service-worker build output so far, not an actual device install).
- If set-editing via the combined "80x8" field proves annoying, split into
  two inputs.
