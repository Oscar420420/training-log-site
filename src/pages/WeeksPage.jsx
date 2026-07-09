import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import EntityRow from '../components/EntityRow.jsx'
import RenameModal from '../components/RenameModal.jsx'
import * as db from '../db.js'

export default function WeeksPage() {
  const { blockId } = useParams()
  const navigate = useNavigate()
  const [block, setBlock] = useState(null)
  const [weeks, setWeeks] = useState([])
  const [weekNumber, setWeekNumber] = useState('')
  const [renaming, setRenaming] = useState(null)

  async function load() {
    setBlock(await db.getBlock(blockId))
    setWeeks(await db.getWeeks(blockId))
  }

  useEffect(() => {
    load()
  }, [blockId])

  async function handleAdd(e) {
    e.preventDefault()
    const num = Number(weekNumber)
    if (!num || num < 1) return
    if (weeks.some((w) => w.weekNumber === num)) {
      alert(`Week ${num} already exists in this block.`)
      return
    }
    const newWeek = await db.addWeek(blockId, num)
    setWeekNumber('')

    const prevWeek = weeks.find((w) => w.weekNumber === num - 1)
    if (prevWeek && confirm(`Copy the day/exercise structure from Week ${prevWeek.weekNumber}? (Only names are copied, not weights.)`)) {
      await db.copyWeekStructure(prevWeek.id, newWeek.id)
    }
    load()
  }

  async function handleDelete(week) {
    if (!confirm(`Delete Week ${week.weekNumber} and everything inside it?`)) return
    await db.deleteWeek(week.id)
    load()
  }

  if (!block) return null

  return (
    <>
      <Header breadcrumb={block.name} title="Weeks" />
      <div className="main">
        <form className="add-form" onSubmit={handleAdd}>
          <input
            placeholder="Week number (e.g. 1)"
            value={weekNumber}
            inputMode="numeric"
            onChange={(e) => setWeekNumber(e.target.value)}
          />
          <button className="btn" type="submit">
            Add
          </button>
        </form>

        <div className="list">
          {weeks.length === 0 && <div className="empty-state">No weeks yet. Add Week 1 above.</div>}
          {weeks.map((week) => (
            <EntityRow
              key={week.id}
              label={`Week ${week.weekNumber}`}
              onOpen={() => navigate(`/blocks/${blockId}/weeks/${week.id}`)}
              onRename={() => setRenaming(week)}
              onDelete={() => handleDelete(week)}
            />
          ))}
        </div>
      </div>

      {renaming && (
        <RenameModal
          title="Change week number"
          initialValue={String(renaming.weekNumber)}
          inputMode="numeric"
          onClose={() => setRenaming(null)}
          onSave={async (value) => {
            const num = Number(value)
            if (!num || num < 1) return
            await db.updateWeek(renaming.id, num)
            setRenaming(null)
            load()
          }}
        />
      )}
    </>
  )
}
