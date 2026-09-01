import { Link } from 'react-router-dom'
import './AdminTopBar.css'
import { adminUser } from '../adminData'

function AdminTopBar() {
  return (
    <header className="admin-topbar glass">
      <div className="admin-topbar-inner">
      <Link className="admin-brand" to="/dashboard" aria-label="BKR dashboard">
          <span className="admin-brand-mark">AX</span>
          <div className="admin-brand-copy">
          <h1>BKR Admin</h1>
            <p>Operations command center</p>
          </div>
        </Link>

        <label className="admin-search" htmlFor="admin-search">
          <span className="material-symbols-outlined">search</span>
          <input id="admin-search" type="search" placeholder="Search users, alerts, or reports" />
        </label>

        <div className="admin-topbar-actions">
          <button className="admin-sync-pill" type="button">
            <span className="chip-dot" />
            Live sync on
          </button>

          <button className="admin-icon-btn" type="button" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
            <span className="admin-badge">5</span>
          </button>

          <button className="admin-profile" type="button" aria-label={`${adminUser.name} profile`}>
            <span className="admin-avatar">{adminUser.initials}</span>
            <span className="admin-profile-copy">
              <strong>{adminUser.name}</strong>
              <span>{adminUser.role}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default AdminTopBar
