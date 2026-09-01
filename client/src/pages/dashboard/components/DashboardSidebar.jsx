import './DashboardSidebar.css'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { dashboardNavigation, quickActions, sidebarStats } from '../dashboardData'
import { formatCurrency, readWalletState } from '../../../utils/wallet'

function DashboardSidebar() {
  const { user } = useAuth()
  const walletState = readWalletState(user)

  return (
    <aside className="dashboard-sidebar glass">
      <section className="sidebar-wallet">
        <span className="sidebar-kicker">Account overview</span>
        <strong>{formatCurrency(walletState.balance)}</strong>
        <p>Available bankroll updated just now</p>

        <div className="sidebar-wallet-metrics">
          {sidebarStats.map((item) => (
            <div className="sidebar-wallet-metric" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        {dashboardNavigation.map((item) =>
          item.href && item.href.startsWith('/') ? (
            <Link
              className={`sidebar-nav-item${item.active ? ' is-active' : ''}`}
              to={item.href}
              key={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ) : (
            <a
              className={`sidebar-nav-item${item.active ? ' is-active' : ''}`}
              href={item.href}
              key={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          )
        )}
      </nav>

      <section className="sidebar-actions">
        {quickActions.map((action) => (
          <button className="sidebar-action-btn" type="button" key={action.label}>
            <span className="material-symbols-outlined">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </section>

      <section className="sidebar-support">
        <div className="sidebar-support-badge">24/7 Desk</div>
        <h3>Need a trading assist?</h3>
        <p>Support is on standby for line questions, cash-out issues, and stake adjustments.</p>
      </section>

      <div className="sidebar-footer-links">
        <Link to="/live-markets">Markets</Link>
        <a href="#bet-history">History</a>
        <a href="#analytics">Analytics</a>
      </div>
    </aside>
  )
}

export default DashboardSidebar
