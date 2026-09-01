import './DashboardSummary.css'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, readWalletState } from '../../../utils/wallet'

function DashboardSummary() {
  const { user } = useAuth()
  const balance = formatCurrency(readWalletState(user).balance)
  const stats = [
    { label: 'Wallet Balance', value: balance, icon: 'account_balance_wallet', accent: true },
    { label: 'Total Bets', value: '142', icon: 'analytics' },
    { label: 'Wins', value: '89', icon: 'emoji_events' },
    { label: 'Profit', value: '+₹3,210.00', icon: 'payments', accent: true, note: '+12%' },
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

