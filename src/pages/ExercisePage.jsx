import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import RenameModal from '../components/RenameModal.jsx'
import ComparisonPanel from '../components/ComparisonPanel.jsx'
import * as db from '../db.js'

export default function ExercisePage() {
  const { blockId, weekId, dayId, exerciseId } = useParams()
  const [block, setBlock] = useState(null)
  const [week, setWeek] = useState(null)
  const [day, setDay] = useState(null)
  const [exercise, setExercise] = useState(null)
  const [sets, setSets] = useState([])
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('')
  const [editingSet, setEditingSet] = useState(null)

  async function load() {
    setBlock(await db.getBlock(blockId))
    setWeek(await db.getWeek(weekId))
    setDay(await db.getDay(dayId))
    setExercise(await db.getExercise(exerciseId))
    setSets(await db.getSets(exerciseId))
  }

  useEffect(() => {
    load()
  }, [blockId, weekId, dayId, exerciseId])

  async function handleAddSet(e) {
    e.preventDefault()
    const w = Number(weight)
    const r = Number(reps)
    if (!w || !r) return
    await db.addSet(exerciseId, { weight: w, reps: r, rpe: rpe ? Number(rpe) : null })
    setWeight('')
    setReps('')
    setRpe('')
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
      <Header
        breadcrumb={`${block.name} › Week ${week.weekNumber} › ${day.name}`}
        title={exercise.name}
      />
      <div className="main">
        <ComparisonPanel exerciseId={exerciseId} refreshKey={sets.length} />

        <div className="section-title">Log a set</div>
        <form className="set-form" onSubmit={handleAddSet}>
          <input
            placeholder="Weight"
            value={weight}
            inputMode="decimal"
            onChange={(e) => setWeight(e.target.value)}
          />
          <input
            placeholder="Reps"
            value={reps}
            inputMode="numeric"
            onChange={(e) => setReps(e.target.value)}
          />
          <button className="btn" type="submit">
            Add
          </button>
          <div className="set-form-extra">
            <input
              placeholder="RPE (optional)"
              value={rpe}
              inputMode="decimal"
              onChange={(e) => setRpe(e.target.value)}
            />
          </div>
        </form>

        <div className="section-title">Today's sets</div>
        <div className="card">
          {sets.length === 0 && <div className="empty-state">No sets logged yet.</div>}
          {sets.map((set, i) => (
            <div className="set-row" key={set.id}>
              <span className="set-index">{i + 1}</span>
              <span className="set-values">
                {set.weight} × {set.reps}
                {set.rpe != null && <span className="set-rpe"> @ RPE {set.rpe}</span>}
              </span>
              <div className="row-actions">
                <button className="icon-btn" onClick={() => setEditingSet(set)} aria-label="Edit">
                  ✎
                </button>
                <button className="icon-btn danger" onClick={() => handleDeleteSet(set)} aria-label="Delete">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingSet && (
        <RenameModal
          title="Edit set (weight x reps)"
          initialValue={`${editingSet.weight}x${editingSet.reps}`}
          onClose={() => setEditingSet(null)}
          onSave={async (value) => {
            const match = value.match(/^\s*([\d.]+)\s*x\s*([\d.]+)\s*$/i)
            if (!match) {
              alert('Use the format: weight x reps, e.g. 80x8')
              return
            }
            await db.updateSet(editingSet.id, { weight: Number(match[1]), reps: Number(match[2]) })
            setEditingSet(null)
            load()
          }}
        />
      )}
    </>
  )
}
