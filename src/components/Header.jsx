import { useNavigate } from 'react-router-dom'
import { useMode } from '../ModeContext.jsx'

export default function Header({ breadcrumb, title, showBack = true }) {
  const navigate = useNavigate()
  const { mode, setMode } = useMode()

  return (
    <div className="header">
      <div className="header-row">
        {showBack && (
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
            ‹
          </button>
        )}
        <div className="header-titles">
          {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
          <div className="page-title">{title}</div>
        </div>
        <div className="mode-toggle" role="group" aria-label="Coach or Train mode">
          <button className={mode === 'coach' ? 'active' : ''} onClick={() => setMode('coach')}>
            Coach
          </button>
          <button className={mode === 'train' ? 'active' : ''} onClick={() => setMode('train')}>
            Train
          </button>
        </div>
      </div>
    </div>
  )
}
