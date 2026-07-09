import { useNavigate } from 'react-router-dom'

export default function Header({ breadcrumb, title, showBack = true }) {
  const navigate = useNavigate()
  return (
    <div className="header">
      <div className="header-row">
        {showBack && (
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
            ‹
          </button>
        )}
        <div>
          {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
          <div className="page-title">{title}</div>
        </div>
      </div>
    </div>
  )
}
