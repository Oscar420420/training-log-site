import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import EntityRow from '../components/EntityRow.jsx'
import RenameModal from '../components/RenameModal.jsx'
import * as db from '../db.js'

export default function LibraryPage() {
  const [entries, setEntries] = useState([])
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState(null)

  async function load() {
    setEntries(await db.getLibraryExercises())
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await db.addLibraryExercise(trimmed)
    setName('')
    load()
  }

  async function handleDelete(entry) {
    if (!confirm(`Remove "${entry.name}" from the library? Existing logged exercises with this name are unaffected.`))
      return
    await db.deleteLibraryExercise(entry.id)
    load()
  }

  return (
    <>
      <Header title="Exercise Library" />
      <div className="main">
        <div className="hint">
          Exercises you add here show up as suggestions when adding an exercise to a day. You can still type a
          brand-new name anywhere — it gets added here automatically.
        </div>

        <form className="add-form" onSubmit={handleAdd}>
          <input placeholder="Exercise name (e.g. Bench Press)" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" type="submit">
            Add
          </button>
        </form>

        <div className="list">
          {entries.length === 0 && <div className="empty-state">No exercises in the library yet.</div>}
          {entries.map((entry) => (
            <EntityRow
              key={entry.id}
              label={entry.name}
              onRename={() => setRenaming(entry)}
              onDelete={() => handleDelete(entry)}
            />
          ))}
        </div>
      </div>

      {renaming && (
        <RenameModal
          title="Rename library exercise"
          initialValue={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={async (value) => {
            await db.updateLibraryExercise(renaming.id, value)
            setRenaming(null)
            load()
          }}
        />
      )}
    </>
  )
}
