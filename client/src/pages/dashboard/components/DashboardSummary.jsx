import './DashboardSummary.css'
import { useAuth } from '../../../context/AuthContext'
import { formatCoins, readWalletState } from '../../../utils/wallet'

function DashboardSummary() {
  const { user } = useAuth()
  const balance = formatCoins(readWalletState(user).virtualCoins)
  const stats = [
    { label: 'Virtual coins', value: balance, icon: 'token', accent: true },
    { label: 'Free predictions', value: '—', icon: 'analytics' },
    { label: 'Wins', value: '89', icon: 'emoji_events' },
    { label: 'Prizes', value: 'None', icon: 'sports_esports' },
  ]
  return (
    <section className="dashboard-overview" id="overview">
      <div className="reference-stat-grid">
        {stats.map((item) => (
          <article className={`reference-stat-card glass${item.accent ? ' is-accent' : ''}`} key={item.label}>
            <div className="reference-stat-top">
              <span className="reference-stat-icon"><span className="material-symbols-outlined">{item.icon}</span></span>
              {item.note ? <span className="reference-stat-note">{item.note}</span> : null}
            </div>
            <span className="reference-stat-label">{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}

export default DashboardSummary

