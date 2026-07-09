import { openDB } from 'idb'

const DB_NAME = 'training-log'
const DB_VERSION = 2

function normalizeName(name) {
  return name.trim().toLowerCase()
}

function newId() {
  return crypto.randomUUID()
}

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore('blocks', { keyPath: 'id' })

      const weeks = db.createObjectStore('weeks', { keyPath: 'id' })
      weeks.createIndex('blockId', 'blockId')

      const days = db.createObjectStore('days', { keyPath: 'id' })
      days.createIndex('weekId', 'weekId')

      const exercises = db.createObjectStore('exercises', { keyPath: 'id' })
      exercises.createIndex('dayId', 'dayId')
      exercises.createIndex('normalizedName', 'normalizedName')

      const sets = db.createObjectStore('sets', { keyPath: 'id' })
      sets.createIndex('exerciseId', 'exerciseId')
    }
    if (oldVersion < 2) {
      const library = db.createObjectStore('exerciseLibrary', { keyPath: 'id' })
      library.createIndex('normalizedName', 'normalizedName')
    }
  },
})

// --- Blocks ---

export async function getBlocks() {
  const db = await dbPromise
  const blocks = await db.getAll('blocks')
  return blocks.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getBlock(id) {
  const db = await dbPromise
  return db.get('blocks', id)
}

export async function addBlock(name) {
  const db = await dbPromise
  const block = { id: newId(), name, createdAt: new Date().toISOString() }
  await db.add('blocks', block)
  return block
}

export async function updateBlock(id, name) {
  const db = await dbPromise
  const block = await db.get('blocks', id)
  if (!block) return
  block.name = name
  await db.put('blocks', block)
}

export async function deleteBlock(id) {
  const db = await dbPromise
  const weeks = await db.getAllFromIndex('weeks', 'blockId', id)
  for (const week of weeks) await deleteWeek(week.id)
  await db.delete('blocks', id)
}

// --- Weeks ---

export async function getWeeks(blockId) {
  const db = await dbPromise
  const weeks = await db.getAllFromIndex('weeks', 'blockId', blockId)
  return weeks.sort((a, b) => a.weekNumber - b.weekNumber)
}

export async function getWeek(id) {
  const db = await dbPromise
  return db.get('weeks', id)
}

export async function addWeek(blockId, weekNumber) {
  const db = await dbPromise
  const week = { id: newId(), blockId, weekNumber, createdAt: new Date().toISOString() }
  await db.add('weeks', week)
  return week
}

export async function updateWeek(id, weekNumber) {
  const db = await dbPromise
  const week = await db.get('weeks', id)
  if (!week) return
  week.weekNumber = weekNumber
  await db.put('weeks', week)
}

export async function deleteWeek(id) {
  const db = await dbPromise
  const days = await db.getAllFromIndex('days', 'weekId', id)
  for (const day of days) await deleteDay(day.id)
  await db.delete('weeks', id)
}

// --- Days ---

export async function getDays(weekId) {
  const db = await dbPromise
  const days = await db.getAllFromIndex('days', 'weekId', weekId)
  return days.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getDay(id) {
  const db = await dbPromise
  return db.get('days', id)
}

export async function addDay(weekId, name) {
  const db = await dbPromise
  const day = { id: newId(), weekId, name, createdAt: new Date().toISOString() }
  await db.add('days', day)
  return day
}

export async function updateDay(id, name) {
  const db = await dbPromise
  const day = await db.get('days', id)
  if (!day) return
  day.name = name
  await db.put('days', day)
}

export async function deleteDay(id) {
  const db = await dbPromise
  const exercises = await db.getAllFromIndex('exercises', 'dayId', id)
  for (const exercise of exercises) await deleteExercise(exercise.id)
  await db.delete('days', id)
}

// --- Exercises ---

export async function getExercises(dayId) {
  const db = await dbPromise
  const exercises = await db.getAllFromIndex('exercises', 'dayId', dayId)
  return exercises.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getExercise(id) {
  const db = await dbPromise
  return db.get('exercises', id)
}

export async function addExercise(dayId, name) {
  const db = await dbPromise
  const exercise = {
    id: newId(),
    dayId,
    name,
    normalizedName: normalizeName(name),
    createdAt: new Date().toISOString(),
  }
  await db.add('exercises', exercise)
  return exercise
}

export async function updateExercise(id, name) {
  const db = await dbPromise
  const exercise = await db.get('exercises', id)
  if (!exercise) return
  exercise.name = name
  exercise.normalizedName = normalizeName(name)
  await db.put('exercises', exercise)
}

export async function deleteExercise(id) {
  const db = await dbPromise
  const sets = await db.getAllFromIndex('sets', 'exerciseId', id)
  for (const set of sets) await db.delete('sets', set.id)
  await db.delete('exercises', id)
}

// --- Sets ---
//
// Each set carries both a coach-authored target (targetRepsMin/Max, targetRPE,
// targetWeight) and the actual logged result (weight, reps, rpe). Reps, rpe
// and weight are pre-filled from the target when a set is created (or when
// its target is edited, as long as the set isn't completed yet) so training
// mode always starts from "what the plan says" and only needs a quick
// override, if the session went differently, to become "what actually
// happened".

export async function getSets(exerciseId) {
  const db = await dbPromise
  const sets = await db.getAllFromIndex('sets', 'exerciseId', exerciseId)
  return sets.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function addSet(
  exerciseId,
  { targetRepsMin = null, targetRepsMax = null, targetRPE = null, targetWeight = null } = {}
) {
  const db = await dbPromise
  const set = {
    id: newId(),
    exerciseId,
    targetRepsMin,
    targetRepsMax,
    targetRPE,
    targetWeight,
    weight: targetWeight,
    reps: targetRepsMax ?? targetRepsMin ?? null,
    rpe: targetRPE,
    completed: false,
    createdAt: new Date().toISOString(),
  }
  await db.add('sets', set)
  return set
}

// Coach mode: edit the prescription. Only touches target* fields, but also
// re-syncs the actual reps/rpe/weight to the new target as long as the set
// hasn't been marked completed yet (so training mode always starts from the
// current plan without silently overwriting a set you already logged).
export async function updateSetTarget(id, { targetRepsMin, targetRepsMax, targetRPE, targetWeight }) {
  const db = await dbPromise
  const set = await db.get('sets', id)
  if (!set) return
  if (targetRepsMin !== undefined) set.targetRepsMin = targetRepsMin
  if (targetRepsMax !== undefined) set.targetRepsMax = targetRepsMax
  if (targetRPE !== undefined) set.targetRPE = targetRPE
  if (targetWeight !== undefined) set.targetWeight = targetWeight
  if (!set.completed) {
    if (targetRepsMax !== undefined) set.reps = targetRepsMax ?? set.targetRepsMin ?? null
    if (targetRPE !== undefined) set.rpe = targetRPE
    if (targetWeight !== undefined) set.weight = targetWeight
  }
  await db.put('sets', set)
}

// Training mode: edit the actual logged result. Only touches weight/reps/rpe/completed.
export async function updateSetActual(id, { weight, reps, rpe, completed }) {
  const db = await dbPromise
  const set = await db.get('sets', id)
  if (!set) return
  if (weight !== undefined) set.weight = weight
  if (reps !== undefined) set.reps = reps
  if (rpe !== undefined) set.rpe = rpe
  if (completed !== undefined) set.completed = completed
  await db.put('sets', set)
}

export async function deleteSet(id) {
  const db = await dbPromise
  await db.delete('sets', id)
}

// --- Cross-week comparison (feature 3) ---
//
// "Last week": same exercise name, in the week immediately before the current
// one (weekNumber - 1) within the same block. Prefers a match on the same
// training day name; falls back to any day in that week if no day name matches.
//
// "Best week": scans every week in the block for this exercise name and picks
// the week with the highest total volume (sum of weight * reps across all its
// sets for that exercise). If the exercise appears on multiple days within a
// single week, that week's volume is the sum across all those occurrences.
// Volume (not top weight) is used because it rewards a week where more total
// work was done, not just a single heavy top set.

async function getExercisesByName(db, blockId, normalizedName) {
  const weeks = await getWeeks(blockId)
  const matches = []
  for (const week of weeks) {
    const days = await getDays(week.id)
    for (const day of days) {
      const exercises = await db.getAllFromIndex('exercises', 'dayId', day.id)
      for (const exercise of exercises) {
        if (exercise.normalizedName === normalizedName) {
          matches.push({ week, day, exercise })
        }
      }
    }
  }
  return matches
}

export async function getLastWeekComparison(exerciseId) {
  const db = await dbPromise
  const exercise = await db.get('exercises', exerciseId)
  if (!exercise) return null
  const day = await db.get('days', exercise.dayId)
  const week = await db.get('weeks', day.weekId)

  const matches = await getExercisesByName(db, week.blockId, exercise.normalizedName)
  const prevWeekMatches = matches.filter((m) => m.week.weekNumber === week.weekNumber - 1)
  if (prevWeekMatches.length === 0) return null

  const sameDayMatch = prevWeekMatches.find(
    (m) => m.day.name.trim().toLowerCase() === day.name.trim().toLowerCase()
  )
  const chosen = sameDayMatch ?? prevWeekMatches[0]

  const sets = await getSets(chosen.exercise.id)
  return { week: chosen.week, day: chosen.day, exercise: chosen.exercise, sets }
}

function totalVolume(sets) {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
}

export async function getBestWeekComparison(exerciseId) {
  const db = await dbPromise
  const exercise = await db.get('exercises', exerciseId)
  if (!exercise) return null
  const day = await db.get('days', exercise.dayId)
  const week = await db.get('weeks', day.weekId)

  const matches = await getExercisesByName(db, week.blockId, exercise.normalizedName)

  const byWeek = new Map()
  for (const m of matches) {
    const sets = await getSets(m.exercise.id)
    const entry = byWeek.get(m.week.id) ?? { week: m.week, sets: [], instances: [] }
    entry.sets.push(...sets)
    entry.instances.push({ day: m.day, exercise: m.exercise, sets })
    byWeek.set(m.week.id, entry)
  }

  let best = null
  for (const entry of byWeek.values()) {
    const volume = totalVolume(entry.sets)
    if (!best || volume > best.volume) {
      best = { volume, week: entry.week, instances: entry.instances }
    }
  }
  if (!best || best.volume === 0) return null

  // If the exercise appeared on more than one day that week, show the single
  // instance with the highest volume rather than merging distinct sessions.
  const topInstance = best.instances.reduce((a, b) =>
    totalVolume(b.sets) > totalVolume(a.sets) ? b : a
  )

  return {
    week: best.week,
    day: topInstance.day,
    exercise: topInstance.exercise,
    sets: topInstance.sets,
    volume: best.volume,
  }
}

// --- Quick-add: copy previous week's structure forward (feature 4 / block base) ---
//
// Copies every day + exercise from the given source week into a new week,
// including each exercise's set targets (rep range/RPE/weight) so the new
// week starts as a full copy of the plan, ready to tweak (e.g. bump a
// weight) rather than rebuilt from scratch. Actual logged results (what was
// really lifted) are never copied — every new set starts uncompleted with
// its actual values equal to the copied target, exactly like a fresh set
// created from that target.

export async function copyWeekStructure(sourceWeekId, targetWeekId) {
  const sourceDays = await getDays(sourceWeekId)
  for (const day of sourceDays) {
    const newDay = await addDay(targetWeekId, day.name)
    const exercises = await getExercises(day.id)
    for (const exercise of exercises) {
      const newExercise = await addExercise(newDay.id, exercise.name)
      const sets = await getSets(exercise.id)
      for (const set of sets) {
        await addSet(newExercise.id, {
          targetRepsMin: set.targetRepsMin,
          targetRepsMax: set.targetRepsMax,
          targetRPE: set.targetRPE,
          targetWeight: set.targetWeight,
        })
      }
    }
  }
}

// --- Exercise library ---
//
// A flat, block/week/day-independent list of exercise names you've used
// before, so building a day's exercise list can be "pick from a list"
// instead of retyping names every time. Adding a day-exercise with a brand
// new name also adds it here (see ExercisesPage), so the library grows on
// its own without a separate curation step.

export async function getLibraryExercises() {
  const db = await dbPromise
  const entries = await db.getAll('exerciseLibrary')
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

export async function addLibraryExercise(name) {
  const db = await dbPromise
  const normalizedName = normalizeName(name)
  const existing = await db.getFromIndex('exerciseLibrary', 'normalizedName', normalizedName)
  if (existing) return existing
  const entry = { id: newId(), name, normalizedName, createdAt: new Date().toISOString() }
  await db.add('exerciseLibrary', entry)
  return entry
}

export async function updateLibraryExercise(id, name) {
  const db = await dbPromise
  const entry = await db.get('exerciseLibrary', id)
  if (!entry) return
  entry.name = name
  entry.normalizedName = normalizeName(name)
  await db.put('exerciseLibrary', entry)
}

export async function deleteLibraryExercise(id) {
  const db = await dbPromise
  await db.delete('exerciseLibrary', id)
}

export { normalizeName }
