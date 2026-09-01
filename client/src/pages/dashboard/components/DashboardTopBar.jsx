import { Link } from 'react-router-dom'
import './DashboardTopBar.css'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { dashboardUser } from '../dashboardData'
import { useAuth } from '../../../context/AuthContext'

function DashboardTopBar() {
  const auth = useAuth()
  const current = auth?.user
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const name = current?.username || dashboardUser.name
  const email = current?.email || ''
  const role = current ? 'Member' : dashboardUser.role
  const initials = (() => {
    if (current?.username) {
      const parts = current.username.split(' ').filter(Boolean)
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return dashboardUser.initials
  })()

  return (
    <header className="dashboard-topbar glass">
      <div className="dashboard-topbar-inner">
        <Link className="dashboard-brand" to="/" aria-label="BKR home">
          <span className="dashboard-brand-mark">BX</span>
          <div className="dashboard-brand-copy">
          <h1>BKR</h1>
            <p>Trading desk</p>
          </div>
        </Link>

        <label className="dashboard-search" htmlFor="dashboard-search">
          <span className="material-symbols-outlined">search</span>
          <input
            id="dashboard-search"
            type="search"
            placeholder="Search teams, leagues, or markets"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') navigate(`/live-markets?search=${encodeURIComponent(search)}`)
            }}
          />
        </label>

        <div className="dashboard-topbar-actions">
          <button className="topbar-icon-btn" type="button" aria-label="Notifications" onClick={() => navigate('/notifications')}>
            <span className="material-symbols-outlined">notifications</span>
            <span className="topbar-badge">3</span>
          </button>

          <div className="topbar-pill">
            <span className="chip-dot" />
            Live odds updating
          </div>

          <Link
            className="topbar-profile"
            aria-label={`${name} profile`}
            to="/profile"
          >
            <span className="topbar-avatar">{initials}</span>
            <span className="topbar-profile-copy">
              <strong>{name}</strong>
              <span>{email || role}</span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default DashboardTopBar
