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

## Data model (IndexedDB, db name `training-log`, version 2)

```
blocks          { id, name, createdAt }
weeks           { id, blockId, weekNumber, createdAt }         index: blockId
days            { id, weekId, name, createdAt }                index: weekId
exercises       { id, dayId, name, normalizedName, createdAt }  index: dayId, normalizedName
sets            { id, exerciseId, createdAt,
                   targetRepsMin, targetRepsMax, targetRPE, targetWeight,
                   weight, reps, rpe, completed }               index: exerciseId
exerciseLibrary { id, name, normalizedName, createdAt }         index: normalizedName
```

- `id` = `crypto.randomUUID()`.
- `normalizedName` = `name.trim().toLowerCase()`, used to match the same
  exercise across weeks/days for the comparison feature, and to dedupe
  library entries.
- Each set carries both a coach-authored **target** (`targetRepsMin/Max`,
  `targetRPE`, `targetWeight`) and the **actual** logged result (`weight`,
  `reps`, `rpe`, `completed`). `reps`/`rpe`/`weight` are pre-filled from the
  target when a set is created (or when its target is edited, as long as it
  isn't marked `completed` yet — see `updateSetTarget` in `src/db.js`), so
  training mode always starts from "what the plan says" and only needs a
  quick override if the session went differently.
- There used to be a `targetRestSeconds` field/rest-timer input in Coach
  mode; it was removed at the user's request. Any old records with that
  field just have it sit unused — no migration needed.
- Deleting a parent cascades to all descendants (see `deleteBlock`,
  `deleteWeek`, `deleteDay`, `deleteExercise` in `src/db.js`).
- Schema changes need a version bump + `upgrade()` migration in `src/db.js`
  only when adding/removing object stores or indexes (the `exerciseLibrary`
  store required bumping to version 2; the target-field additions to `sets`
  earlier did not, since those are just new plain fields). The `upgrade()`
  callback is guarded by `oldVersion` checks so it can keep growing
  incrementally. Treat this as the one costly-to-change area and confirm
  before restructuring it.

## What's built

1. **Navigation & CRUD** — full hierarchy: Blocks (`/`) → Weeks
   (`/blocks/:blockId`) → Days (`/blocks/:blockId/weeks/:weekId`) → Exercises
   (`.../days/:dayId`) → Sets (`.../exercises/:exerciseId`). Add/rename/delete
   at every level. Sticky header shows breadcrumb + current level title.
   Delete cascades and confirms first.
2. **Persistence** — every add/edit/delete writes straight to IndexedDB via
   `src/db.js`; verified surviving a full page reload.
3. **Comparison feature** — on the exercise screen, a toggle above the set
   table (train mode only):
   - **Last week**: same exercise name in `weekNumber - 1` of the same block,
     preferring the same day name, falling back to any day in that week.
   - **Best week**: scans every week in the block for the same exercise name
     and picks the week with the highest **total volume** (Σ weight × reps).
   Logic documented in comments above `getLastWeekComparison` /
   `getBestWeekComparison` in `src/db.js`.
4. **Coach mode / Train mode** — a global toggle in the header
   (`src/ModeContext.jsx`, persisted to `localStorage`):
   - **Coach mode**: prescribe each set individually — rep range (e.g.
     `8-12`), target RPE, target weight. Sets can be added/removed here.
   - **Train mode**: log today's session — each set shows a clear "Coach:
     8-12 reps · RPE 8.5 · 60 kg" summary line, and the reps/RPE/weight
     inputs are pre-filled from that target so you usually just confirm or
     tweak. A checkmark circle marks a set done. The Last week/Best week
     panel sits above the table. A floating "Next exercise" pill (bottom
     right, matching the reference app) appears whenever there's a
     following exercise in the same day and jumps straight to it — it's
     absent on the last exercise of a day.
5. **Exercise Library** (`src/pages/LibraryPage.jsx`, route `/library`,
   linked from the home screen) — a flat, reusable list of exercise names.
   Adding an exercise to a day shows a `<datalist>` autocomplete sourced from
   the library; typing a brand-new name still works and auto-adds it to the
   library (`addLibraryExercise` dedupes by `normalizedName`).
6. **Block "base" copy-forward** — adding a new week offers to copy the
   *entire plan* (days, exercises, and each set's target reps/RPE/weight —
   not just names) from the closest earlier week, so week N+1 starts as a
   full copy of week N ready to tweak (e.g. bump one weight) instead of
   being rebuilt from scratch (`copyWeekStructure` in `src/db.js`).
7. **Polish** — numeric keypad inputs, big tap targets, mobile-first
   max-width-640px layout, near-black/dark-navy + blue palette (inspired by
   MyStrengthBook, replacing an earlier slate/sky-blue look), inline SVG
   icons (`src/components/Icons.jsx`) instead of emoji, subtle card shadows,
   lettered A/B/C badges on exercise rows.

All features have been manually exercised end-to-end with a headless
browser after every change (add block → week → day → exercise → sets,
reload to confirm persistence, cross-week comparison with real data,
copy-forward with targets, exercise library autocomplete + auto-add,
coach-mode weight prescription → train-mode pre-fill) — not just built,
but verified working.

## Known simplifications / not done

- No cross-device sync (explicit non-goal) — each browser/device has its own
  local IndexedDB data. A manual export/import (JSON) was discussed as a
  possible stopgap but not yet built.
- No charts/analytics beyond last-week/best-week (explicit non-goal).
- No rest-timer countdown — was built once, then explicitly removed at the
  user's request ("I don't know why I put it there").
- Structural CRUD (add/rename/delete Blocks/Weeks/Days/Exercises) is not
  gated behind Coach/Train mode — works the same in both, by design so far.
- No automated test suite (Vitest/RTL) yet — verification so far has been
  manual/scripted browser exercising, not committed test files.

## Next steps (nothing currently blocking)

- Consider installing the app on a real phone and confirming the "Add to
  Home Screen" flow and offline behavior end-to-end.
- Possible follow-ups raised but not yet requested: export/import JSON for
  moving data between devices; gating structural edits behind coach mode; a
  dedicated Exercise Library detail view (e.g. showing history across all
  blocks for one exercise).
