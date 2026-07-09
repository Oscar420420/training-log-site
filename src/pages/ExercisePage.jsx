import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import ComparisonPanel from '../components/ComparisonPanel.jsx'
import { TrashIcon, CheckIcon, ArrowRightIcon } from '../components/Icons.jsx'
import { useMode } from '../ModeContext.jsx'
import * as db from '../db.js'

function parseRepsRange(value) {
  const match = value.trim().match(/^(\d+)\s*(?:-\s*(\d+))?$/)
  if (!match) return null
  const min = Number(match[1])
  const max = match[2] ? Number(match[2]) : min
  return { min, max }
}

function repsRangeText(set) {
  if (set.targetRepsMin == null) return ''
  if (set.targetRepsMin === set.targetRepsMax) return String(set.targetRepsMin)
  return `${set.targetRepsMin}-${set.targetRepsMax}`
}

function targetSummary(set) {
  const parts = []
  if (set.targetRepsMin != null) parts.push(`${repsRangeText(set)} reps`)
  if (set.targetRPE != null) parts.push(`RPE ${set.targetRPE}`)
  if (set.targetWeight != null) parts.push(`${set.targetWeight} kg`)
  return parts.join(' · ')
}

export default function ExercisePage() {
  const { blockId, weekId, dayId, exerciseId } = useParams()
  const navigate = useNavigate()
  const { mode } = useMode()
  const [block, setBlock] = useState(null)
  const [week, setWeek] = useState(null)
  const [day, setDay] = useState(null)
  const [exercise, setExercise] = useState(null)
  const [badge, setBadge] = useState(null)
  const [nextExercise, setNextExercise] = useState(null)
  const [sets, setSets] = useState([])
  const [fields, setFields] = useState({})

  async function load() {
    const [b, w, d, ex, exList, setList] = await Promise.all([
      db.getBlock(blockId),
      db.getWeek(weekId),
      db.getDay(dayId),
      db.getExercise(exerciseId),
      db.getExercises(dayId),
      db.getSets(exerciseId),
    ])
    setBlock(b)
    setWeek(w)
    setDay(d)
    setExercise(ex)
    const idx = exList.findIndex((e) => e.id === exerciseId)
    setBadge(idx >= 0 ? String.fromCharCode(65 + idx) : null)
    setNextExercise(idx >= 0 ? exList[idx + 1] ?? null : null)
    setSets(setList)
  }

  useEffect(() => {
    load()
  }, [blockId, weekId, dayId, exerciseId])

  useEffect(() => {
    const next = {}
    for (const set of sets) {
      next[set.id] = {
        reps: set.reps ?? '',
        rpe: set.rpe ?? '',
        weight: set.weight ?? '',
        repsRange: repsRangeText(set),
        targetRPE: set.targetRPE ?? '',
        targetWeight: set.targetWeight ?? '',
      }
    }
    setFields(next)
  }, [sets])

  function field(setId, key) {
    return fields[setId]?.[key] ?? ''
  }

  function setField(setId, key, value) {
    setFields((prev) => ({ ...prev, [setId]: { ...prev[setId], [key]: value } }))
  }

  async function commitActual(setId, key, rawValue) {
    const value = rawValue === '' ? null : Number(rawValue)
    await db.updateSetActual(setId, { [key]: value })
    load()
  }

  async function commitRepsRange(setId, rawValue) {
    const parsed = parseRepsRange(rawValue)
    await db.updateSetTarget(setId, {
      targetRepsMin: parsed?.min ?? null,
      targetRepsMax: parsed?.max ?? null,
    })
    load()
  }

  async function commitTargetRPE(setId, rawValue) {
    const value = rawValue === '' ? null : Number(rawValue)
    await db.updateSetTarget(setId, { targetRPE: value })
    load()
  }

  async function commitTargetWeight(setId, rawValue) {
    const value = rawValue === '' ? null : Number(rawValue)
    await db.updateSetTarget(setId, { targetWeight: value })
    load()
  }

  async function toggleCompleted(set) {
    await db.updateSetActual(set.id, { completed: !set.completed })
    load()
  }

  async function handleAddSet() {
    await db.addSet(exerciseId, {})
    load()
  }

  async function handleDeleteSet(set) {
    if (!confirm('Delete this set?')) return
    await db.deleteSet(set.id)
    load()
  }

  if (!block || !week || !day || !exercise) return null

  return (
    <>
      <Header breadcrumb={`${block.name} › Week ${week.weekNumber} › ${day.name}`} title="Exercise" />
      <div className="main" style={nextExercise ? { paddingBottom: 76 } : undefined}>
        <div className="exercise-header">
          {badge && <span className="badge">{badge}</span>}
          <span className="exercise-title">{exercise.name}</span>
        </div>

        {mode === 'train' && <ComparisonPanel exerciseId={exerciseId} refreshKey={sets.length} />}

        {mode === 'coach' ? (
          <div className="set-table">
            <div className="set-table-cols">
              <span>Set</span>
              <span>Reps</span>
              <span>RPE</span>
              <span>Weight</span>
              <span></span>
            </div>
            {sets.map((set, i) => (
              <div className="set-table-row" key={set.id}>
                <span className="set-index">{i + 1}</span>
                <div className="set-cell">
                  <input
                    placeholder="8-12"
                    value={field(set.id, 'repsRange')}
                    onChange={(e) => setField(set.id, 'repsRange', e.target.value)}
                    onBlur={(e) => commitRepsRange(set.id, e.target.value)}
                  />
                </div>
                <div className="set-cell">
                  <input
                    placeholder="8.5"
                    inputMode="decimal"
                    value={field(set.id, 'targetRPE')}
                    onChange={(e) => setField(set.id, 'targetRPE', e.target.value)}
                    onBlur={(e) => commitTargetRPE(set.id, e.target.value)}
                  />
                </div>
                <div className="set-cell">
                  <input
                    placeholder="kg"
                    inputMode="decimal"
                    value={field(set.id, 'targetWeight')}
                    onChange={(e) => setField(set.id, 'targetWeight', e.target.value)}
                    onBlur={(e) => commitTargetWeight(set.id, e.target.value)}
                  />
                </div>
                <button className="icon-btn danger" onClick={() => handleDeleteSet(set)} aria-label="Delete set">
                  <TrashIcon />
                </button>
              </div>
            ))}
            <div className="set-table-footer">
              <button className="btn secondary full" onClick={handleAddSet}>
                Add Set
              </button>
            </div>
          </div>
        ) : (
          <div className="set-table">
            <div className="set-table-cols">
              <span>Set</span>
              <span>Reps</span>
              <span>RPE</span>
              <span>Load</span>
              <span></span>
            </div>
            {sets.map((set, i) => {
              const summary = targetSummary(set)
              return (
                <div className="set-block" key={set.id}>
                  {summary && <div className="set-target-summary">Coach: {summary}</div>}
                  <div className="set-table-row">
                    <span className="set-index">{i + 1}</span>
                    <div className="set-cell">
                      <input
                        inputMode="numeric"
                        value={field(set.id, 'reps')}
                        onChange={(e) => setField(set.id, 'reps', e.target.value)}
                        onBlur={(e) => commitActual(set.id, 'reps', e.target.value)}
                      />
                    </div>
                    <div className="set-cell">
                      <input
                        inputMode="decimal"
                        value={field(set.id, 'rpe')}
                        onChange={(e) => setField(set.id, 'rpe', e.target.value)}
                        onBlur={(e) => commitActual(set.id, 'rpe', e.target.value)}
                      />
                    </div>
                    <div className="set-cell">
                      <input
                        placeholder="-"
                        inputMode="decimal"
                        value={field(set.id, 'weight')}
                        onChange={(e) => setField(set.id, 'weight', e.target.value)}
                        onBlur={(e) => commitActual(set.id, 'weight', e.target.value)}
                      />
                    </div>
                    <button
                      className={`set-check ${set.completed ? 'done' : ''}`}
                      onClick={() => toggleCompleted(set)}
                      aria-label="Mark set done"
                    >
                      <CheckIcon />
                    </button>
                  </div>
                </div>
              )
            })}
            <div className="set-table-footer">
              <button className="btn secondary full" onClick={handleAddSet}>
                Add Set
              </button>
            </div>
          </div>
        )}

        {nextExercise && (
          <button
            className="next-exercise-btn"
            onClick={() =>
              navigate(`/blocks/${blockId}/weeks/${weekId}/days/${dayId}/exercises/${nextExercise.id}`)
            }
          >
            <span className="next-exercise-text">
              <span className="next-exercise-label">Next exercise</span>
              <span className="next-exercise-name">{nextExercise.name}</span>
            </span>
            <span className="next-exercise-arrow">
              <ArrowRightIcon />
            </span>
          </button>
        )}
      </div>
    </>
  )
}
