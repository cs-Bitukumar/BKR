import './DashboardBottomNav.css'
import { Link } from 'react-router-dom'

const items = [
  { icon: 'space_dashboard', label: 'Overview', href: '#overview', active: true },
  { icon: 'sports_basketball', label: 'Live', href: '/live-markets' },
  { icon: 'casino', label: 'Ludo', href: '/ludo' },
  { icon: 'insights', label: 'Analytics', href: '#analytics' },
  { icon: 'history', label: 'History', href: '#bet-history' },
  { icon: 'account_balance_wallet', label: 'Wallet', href: '/wallet' },
]

function DashboardBottomNav() {
  return (
    <nav className="dashboard-bottom-nav glass" aria-label="Mobile dashboard navigation">
      {items.map((item) => (
        item.href && item.href.startsWith('/') ? (
          <Link
            className={`bottom-nav-item${item.active ? ' is-active' : ''}`}
            to={item.href}
            key={item.label}
            aria-current={item.active ? 'page' : undefined}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ) : (
          <a
            className={`bottom-nav-item${item.active ? ' is-active' : ''}`}
            href={item.href}
            key={item.label}
            aria-current={item.active ? 'page' : undefined}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        )
      ))}
    </nav>
  )
}

export default DashboardBottomNav

