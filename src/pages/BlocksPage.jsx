import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import EntityRow from '../components/EntityRow.jsx'
import RenameModal from '../components/RenameModal.jsx'
import * as db from '../db.js'

export default function BlocksPage() {
  const navigate = useNavigate()
  const [blocks, setBlocks] = useState([])
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState(null)

  async function load() {
    setBlocks(await db.getBlocks())
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await db.addBlock(trimmed)
    setName('')
    load()
  }

  async function handleDelete(block) {
    if (!confirm(`Delete "${block.name}" and everything inside it?`)) return
    await db.deleteBlock(block.id)
    load()
  }

  return (
    <>
      <Header title="Training Log" showBack={false} />
      <div className="main">
        <form className="add-form" onSubmit={handleAdd}>
          <input
            placeholder="New block name (e.g. Block 1 - Hypertrophy)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn" type="submit">
            Add
          </button>
        </form>

        <div className="list">
          {blocks.length === 0 && <div className="empty-state">No blocks yet. Add your first one above.</div>}
          {blocks.map((block) => (
            <EntityRow
              key={block.id}
              label={block.name}
              onOpen={() => navigate(`/blocks/${block.id}`)}
              onRename={() => setRenaming(block)}
              onDelete={() => handleDelete(block)}
            />
          ))}
        </div>
      </div>

      {renaming && (
        <RenameModal
          title="Rename block"
          initialValue={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={async (value) => {
            await db.updateBlock(renaming.id, value)
            setRenaming(null)
            load()
          }}
        />
      )}
    </>
  )
}
