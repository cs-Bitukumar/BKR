import './AdminSidebar.css'
import { adminActions, adminNavigation } from '../adminData'

const adminStats = [
  { label: 'Uptime', value: '99.98%' },
  { label: 'Alerts', value: '5 active' },
  { label: 'Reviews', value: '38 pending' },
]

function AdminSidebar() {
  return (
    <aside className="admin-sidebar glass">
      <section className="admin-sidebar-status">
        <span className="admin-sidebar-kicker">Control status</span>
        <strong>All systems visible</strong>
        <p>Monitoring player risk, payments, and live operations in real time.</p>

        <div className="admin-sidebar-metrics">
          {adminStats.map((item) => (
            <div className="admin-sidebar-metric" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        {adminNavigation.map((item) => (
          <a
            className={`admin-sidebar-nav-item${item.active ? ' is-active' : ''}`}
            href={item.href}
            key={item.label}
            aria-current={item.active ? 'page' : undefined}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <section className="admin-sidebar-actions">
        {adminActions.map((action) => (
          <button className="admin-sidebar-action" type="button" key={action.label}>
            <span className="material-symbols-outlined">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </section>

      <section className="admin-sidebar-note">
        <div className="admin-sidebar-note-badge">Compliance desk</div>
        <h3>Escalations need attention?</h3>
        <p>Use this panel to broadcast notices, review alerts, and export reports quickly.</p>
      </section>
    </aside>
  )
}

export default AdminSidebar
