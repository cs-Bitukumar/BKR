import { useEffect, useState } from 'react'
import './AdminPage.css'
import { get, patch } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import AdminTopBar from './components/AdminTopBar'
import AdminSidebar from './components/AdminSidebar'
import {
  adminStats,
  adminUsers as seedUsers,
  moderationQueue,
  systemHealth,
  auditTrail,
} from './adminData'

function ComplaintCase({ item, token, onUpdated, onError }) {
  const [status, setStatus] = useState(item.status)
  const [internalNotes, setInternalNotes] = useState(item.internalNotes || '')
  const [resolutionMessage, setResolutionMessage] = useState(item.resolutionMessage || '')
  const [saving, setSaving] = useState(false)
  async function save(event) {
    event.preventDefault(); setSaving(true)
    try {
      const updated = await patch(`/api/admin/complaints/${item._id}`, { status, internalNotes, resolutionMessage }, token)
      onUpdated(updated)
    } catch (error) { onError(error.message || 'Unable to update complaint') }
    finally { setSaving(false) }
  }
  return <article className="admin-complaint-card"><header><div><strong>{item.referenceId}</strong><span>{item.category} · {new Date(item.createdAt).toLocaleString()}</span></div><span className={`admin-status-pill is-${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span></header><h3>{item.subject}</h3><p className="admin-complaint-contact">{item.name} · {item.email}</p><p className="admin-complaint-details">{item.details}</p><form onSubmit={save}><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option>Pending</option><option>In Progress</option><option>Resolved</option></select></label><label>Internal notes<textarea rows="2" maxLength="5000" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} /></label><label>Resolution message<textarea rows="2" maxLength="3000" value={resolutionMessage} onChange={(event) => setResolutionMessage(event.target.value)} /></label><button className="secondary-btn admin-secondary" disabled={saving}>{saving ? 'Saving…' : 'Save case'}</button></form></article>
}

function AdminPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState(seedUsers)
  const [overview, setOverview] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([get('/api/admin/users', token), get('/api/admin/overview', token), get('/api/admin/complaints', token)])
      .then(([nextUsers, nextOverview, nextComplaints]) => {
        if (!active) return
        setUsers(Array.isArray(nextUsers) ? nextUsers : seedUsers)
        setOverview(nextOverview)
        setComplaints(Array.isArray(nextComplaints) ? nextComplaints : [])
      })
      .catch((error) => active && setMessage(error.message || 'Unable to load admin data'))
    return () => { active = false }
  }, [token])

  async function promoteUser(user) {
    try {
      const updated = await patch(`/api/admin/users/${user._id || user.id}`, { role: user.role === 'admin' ? 'user' : 'admin' }, token)
      setUsers((current) => current.map((item) => (item._id === updated._id ? updated : item)))
      setMessage(`${updated.username} updated.`)
    } catch (error) { setMessage(error.message || 'Unable to update user') }
  }

  function exportReport() {
    const blob = new Blob([JSON.stringify({ overview, users }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'bkr-admin-report.json'
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Admin report exported.')
  }

  return (
    <main className="admin-page">
      <AdminTopBar />

      <div className="admin-shell">
          <AdminSidebar />

          <div className="admin-main">
          {message ? <p className="admin-feedback" role="status">{message}</p> : null}
          <section className="admin-hero glass" id="admin-overview">
            <div className="admin-hero-copy">
              <span className="chip">
                <span className="chip-dot" />
                Admin control center
              </span>

              <div className="admin-hero-text">
                <h2>Manage accounts and community safety.</h2>
                <p>
                  Review account activity, broadcast notices, and keep the
                  platform healthy with a dedicated operations view.
                </p>
              </div>

              <div className="admin-hero-actions">
                <button className="primary-btn admin-primary" type="button" onClick={() => setMessage('Broadcast queued for delivery.') }>
                  <span className="material-symbols-outlined">campaign</span>
                  Broadcast notice
                </button>
                <button className="secondary-btn admin-secondary" type="button" onClick={exportReport}>
                  <span className="material-symbols-outlined">download</span>
                  Export report
                </button>
              </div>
            </div>

            <div className="admin-hero-stats">
              {adminStats.map((item) => (
                <article className="admin-stat glass-lite" key={item.label}>
                  <div className="admin-stat-top">
                    <span className="admin-stat-icon">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </span>
                    <span className="admin-stat-note">{item.note}</span>
                  </div>
                  <strong>{overview && item.label === 'Active bettors' ? overview.users : item.value}</strong>
                  <p>{item.label}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-panels">
            <article className="admin-panel glass admin-complaints-panel" id="admin-complaints">
              <div className="panel-header"><div><h2>Grievance Cases</h2><p>Private complaints visible only to authorized administrators.</p></div><span className="panel-live-count">{complaints.length} cases</span></div>
              <div className="admin-complaints-list">{complaints.length ? complaints.map((item) => <ComplaintCase key={item._id} item={item} token={token} onError={setMessage} onUpdated={(updated) => setComplaints((current) => current.map((row) => row._id === updated._id ? updated : row))} />) : <p className="admin-complaint-empty">No complaints have been submitted.</p>}</div>
            </article>
            <article className="admin-panel glass admin-users-panel" id="admin-users">
              <div className="panel-header">
                <div>
                  <h2>User Management</h2>
                  <p>Review accounts and virtual coin balances.</p>
                </div>
                <button className="panel-filter" type="button" aria-label="Filter users">
                  <span className="material-symbols-outlined">filter_alt</span>
                </button>
              </div>

              <div className="admin-table">
                <div className="admin-table-head">
                  <span>User</span>
                  <span>Segment</span>
                  <span>Virtual coins</span>
                  <span>Status</span>
                </div>

                {users.map((user) => (
                  <article className="admin-table-row" key={user.email}>
                    <div className="admin-user-copy">
                      <strong>{user.name || user.username}</strong>
                      <span>{user.email}</span>
                    </div>
                    <span>{user.segment || user.role}</span>
                    <strong>{Number(user.virtualCoins || 0).toLocaleString('en-IN')} coins</strong>
                    <span className={`admin-status-pill is-${user.status?.toLowerCase() || 'active'}`}>
                      {user.status || 'Active'}
                    </span>
                    <button type="button" onClick={() => promoteUser(user)}>{user.role === 'admin' ? 'Demote' : 'Make admin'}</button>
                  </article>
                ))}
              </div>
            </article>

            <article className="admin-panel glass admin-moderation-panel" id="admin-moderation">
              <div className="panel-header">
                <div>
                  <h2>Moderation Queue</h2>
                  <p>High-priority issues needing review by operations.</p>
                </div>
                <span className="panel-live-count">
                  <span className="chip-dot" />
                  3 live cases
                </span>
              </div>

              <div className="admin-queue-list">
                {moderationQueue.map((item) => (
                  <article className="admin-queue-card" key={item.title}>
                    <div className="admin-queue-top">
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.detail}</p>
                      </div>
                      <span className={`queue-priority is-${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="admin-queue-footer">
                      <span>Owner: {item.owner}</span>
                      <button type="button" onClick={() => setMessage(`Review opened for ${item.title}.`)}>Review</button>
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className="admin-panel glass admin-health-panel" id="admin-health">
              <div className="panel-header">
                <div>
                  <h2>System Health</h2>
                  <p>Real-time uptime, latency, and service checks.</p>
                </div>
                <span className="admin-health-badge">
                  <span className="chip-dot" />
                  Stable
                </span>
              </div>

              <div className="admin-health-grid">
                {systemHealth.map((item) => (
                  <article className="admin-health-card" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.status}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="admin-panel glass admin-audit-panel" id="admin-audit">
              <div className="panel-header">
                <div>
                  <h2>Audit Trail</h2>
                  <p>Recent actions captured across the control desk.</p>
                </div>
              </div>

              <div className="admin-audit-list">
                {auditTrail.map((item) => (
                  <article className="admin-audit-item" key={`${item.time}-${item.event}`}>
                    <strong>{item.time}</strong>
                    <div>
                      <h3>{item.event}</h3>
                      <p>{item.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>

          <footer className="admin-footer glass">
            <div>
              <h3>BKR Admin</h3>
              <p>
                Dedicated workspace for compliance, risk, and operations. Keep the platform
                efficient and the user experience secure.
              </p>
            </div>
            <div className="admin-footer-links">
              <a href="#admin-users">Users</a>
              <a href="#admin-moderation">Moderation</a>
              <a href="#admin-health">Health</a>
              <a href="#admin-audit">Audit</a>
            </div>
          </footer>
        </div>
      </div>
    </main>
  )
}

export default AdminPage
