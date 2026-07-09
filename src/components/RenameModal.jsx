import { useState } from 'react'

export default function RenameModal({ title, initialValue, inputMode, onSave, onClose }) {
  const [value, setValue] = useState(initialValue)

  function submit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="section-title">{title}</div>
        <input
          autoFocus
          value={value}
          inputMode={inputMode}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn secondary full" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn full">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
