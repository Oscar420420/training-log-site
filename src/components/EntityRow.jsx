export default function EntityRow({ label, sub, onOpen, onRename, onDelete }) {
  return (
    <div className="row-card">
      <button className="row-main" onClick={onOpen}>
        <span>
          {label}
          {sub && <div className="row-sub">{sub}</div>}
        </span>
      </button>
      <div className="row-actions">
        {onRename && (
          <button className="icon-btn" onClick={onRename} aria-label="Rename">
            ✎
          </button>
        )}
        {onDelete && (
          <button className="icon-btn danger" onClick={onDelete} aria-label="Delete">
            🗑
          </button>
        )}
      </div>
    </div>
  )
}
