import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import EntityRow from '../components/EntityRow.jsx'
import RenameModal from '../components/RenameModal.jsx'
import * as db from '../db.js'

export default function ExercisesPage() {
  const { blockId, weekId, dayId } = useParams()
  const navigate = useNavigate()
  const [block, setBlock] = useState(null)
  const [week, setWeek] = useState(null)
  const [day, setDay] = useState(null)
  const [exercises, setExercises] = useState([])
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState(null)

  async function load() {
    setBlock(await db.getBlock(blockId))
    setWeek(await db.getWeek(weekId))
    setDay(await db.getDay(dayId))
    setExercises(await db.getExercises(dayId))
  }

  useEffect(() => {
    load()
  }, [blockId, weekId, dayId])

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await db.addExercise(dayId, trimmed)
    setName('')
    load()
  }

  async function handleDelete(exercise) {
    if (!confirm(`Delete "${exercise.name}" and all its logged sets?`)) return
    await db.deleteExercise(exercise.id)
    load()
  }

  if (!block || !week || !day) return null

  return (
    <>
      <Header breadcrumb={`${block.name} › Week ${week.weekNumber} › ${day.name}`} title="Exercises" />
      <div className="main">
        <form className="add-form" onSubmit={handleAdd}>
          <input
            placeholder="Exercise name (e.g. Bench Press)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn" type="submit">
            Add
          </button>
        </form>

        <div className="list">
          {exercises.length === 0 && <div className="empty-state">No exercises yet. Add your first one above.</div>}
          {exercises.map((exercise, i) => (
            <EntityRow
              key={exercise.id}
              badge={String.fromCharCode(65 + i)}
              label={exercise.name}
              onOpen={() => navigate(`/blocks/${blockId}/weeks/${weekId}/days/${dayId}/exercises/${exercise.id}`)}
              onRename={() => setRenaming(exercise)}
              onDelete={() => handleDelete(exercise)}
            />
          ))}
        </div>
      </div>

      {renaming && (
        <RenameModal
          title="Rename exercise"
          initialValue={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={async (value) => {
            await db.updateExercise(renaming.id, value)
            setRenaming(null)
            load()
          }}
        />
      )}
    </>
  )
}
