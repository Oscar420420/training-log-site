import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import EntityRow from '../components/EntityRow.jsx'
import RenameModal from '../components/RenameModal.jsx'
import * as db from '../db.js'

export default function DaysPage() {
  const { blockId, weekId } = useParams()
  const navigate = useNavigate()
  const [block, setBlock] = useState(null)
  const [week, setWeek] = useState(null)
  const [days, setDays] = useState([])
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState(null)

  async function load() {
    setBlock(await db.getBlock(blockId))
    setWeek(await db.getWeek(weekId))
    setDays(await db.getDays(weekId))
  }

  useEffect(() => {
    load()
  }, [blockId, weekId])

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await db.addDay(weekId, trimmed)
    setName('')
    load()
  }

  async function handleDelete(day) {
    if (!confirm(`Delete "${day.name}" and everything inside it?`)) return
    await db.deleteDay(day.id)
    load()
  }

  if (!block || !week) return null

  return (
    <>
      <Header breadcrumb={`${block.name} › Week ${week.weekNumber}`} title="Training Days" />
      <div className="main">
        <form className="add-form" onSubmit={handleAdd}>
          <input
            placeholder="Day name (e.g. Day 1 - Push)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn" type="submit">
            Add
          </button>
        </form>

        <div className="list">
          {days.length === 0 && <div className="empty-state">No days yet. Add your first one above.</div>}
          {days.map((day) => (
            <EntityRow
              key={day.id}
              label={day.name}
              onOpen={() => navigate(`/blocks/${blockId}/weeks/${weekId}/days/${day.id}`)}
              onRename={() => setRenaming(day)}
              onDelete={() => handleDelete(day)}
            />
          ))}
        </div>
      </div>

      {renaming && (
        <RenameModal
          title="Rename day"
          initialValue={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={async (value) => {
            await db.updateDay(renaming.id, value)
            setRenaming(null)
            load()
          }}
        />
      )}
    </>
  )
}
