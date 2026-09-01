import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { get } from '../../api/api'
import './WalletPage.css'
import { walletQuickMethods, formatCurrency, getWalletTransactions, readWalletState } from '../../utils/wallet'

function WalletPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState(() => readWalletState(user))
  const { token, refreshUser } = useAuth()

  useEffect(() => {
    let active = true
    get('/api/wallet', token).then((data) => {
      if (!active) return
      setWallet({
        ...data,
        transactions: (data.transactions || []).map((transaction) => ({
          ...transaction,
          amount: `${Number(transaction.amount) >= 0 ? '+' : '-'}${formatCurrency(Math.abs(Number(transaction.amount)))}`,
          status: String(transaction.status || '').toUpperCase(),
          tone: Number(transaction.amount) >= 0 ? 'positive' : 'pending',
        })),
      })
      if (data.user) refreshUser(data.user)
    }).catch(() => {})
    return () => { active = false }
  }, [token, refreshUser])

  const walletState = wallet
  const visibleBalance = walletState.balance

  const walletStats = [
    { label: 'Monthly deposits', value: formatCurrency(walletState.monthlyDeposits) },
    { label: 'Monthly winnings', value: formatCurrency(walletState.monthlyWinnings) },
  ]

  const balanceLabel = formatCurrency(visibleBalance)
  const recentTransactions = walletState.transactions || getWalletTransactions(user)

  return (
    <main className="wallet-page">
      <header className="wallet-topbar glass">
        <div className="wallet-topbar-inner">
          <div className="wallet-topbar-brand">
            <Link className="wallet-back-btn" to="/dashboard" aria-label="Back to dashboard">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>

            <div className="wallet-brand-copy">
              <span className="material-symbols-outlined wallet-brand-icon">account_balance_wallet</span>
              <div>
                <h1>BKR WALLET</h1>
                <p>Premium betting simulation</p>
              </div>
            </div>
          </div>

          <button className="wallet-notification-btn" type="button" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <div className="wallet-shell">
        <div className='available-balance'>{balanceLabel}</div>

        <section className="wallet-stats-grid">
          {walletStats.map((stat) => (
            <article className="wallet-stat-card glass" key={stat.label}>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="wallet-actions-section">
          <Link className="wallet-primary-action" to="/wallet/deposit">
            <span className="material-symbols-outlined">add_circle</span>
            Deposit Funds
          </Link>
          <Link className="wallet-secondary-action" to="/wallet/withdraw">
            <span className="material-symbols-outlined">outbound</span>
            Withdrawal
          </Link>
        </section>

        <section className="wallet-quick-deposit">
          <div className="wallet-section-header">
            <h3>Quick Deposit</h3>
            <span>Fast methods ready</span>
          </div>

          <div className="wallet-methods-row">
            {walletQuickMethods.map((method) => (
              <div className="wallet-method-card glass" key={method.label}>
                <span className="material-symbols-outlined">{method.icon}</span>
                <strong>{method.label}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="wallet-transactions-section">
          <div className="wallet-section-header">
            <h3>Recent Transactions</h3>
            <button type="button">View All</button>
          </div>

          <div className="wallet-transaction-list">
            {recentTransactions.map((transaction) => (
              <article
                className={`wallet-transaction-card glass is-${transaction.tone}`}
                key={transaction.id || `${transaction.title}-${transaction.date}`}
              >
                <div className="wallet-transaction-left">
                  <div className="wallet-transaction-icon">
                    <span className="material-symbols-outlined">{transaction.icon}</span>
                  </div>
                  <div>
                    <h4>{transaction.title}</h4>
                    <p>{transaction.date}</p>
                  </div>
                </div>

                <div className="wallet-transaction-right">
                  <strong>{transaction.amount}</strong>
                  <span>{transaction.status}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <nav className="wallet-bottom-nav glass" aria-label="Wallet navigation">
        <Link className="wallet-bottom-nav-item" to="/dashboard">
          <span className="material-symbols-outlined">sports_esports</span>
          <span>Lobby</span>
        </Link>
        <Link className="wallet-bottom-nav-item" to="/live-markets">
          <span className="material-symbols-outlined">sensors</span>
          <span>Live</span>
        </Link>
        <Link className="wallet-bottom-nav-item is-active" to="/wallet" aria-current="page">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <span>Wallet</span>
        </Link>
        <Link className="wallet-bottom-nav-item" to="/profile">
          <span className="material-symbols-outlined">person</span>
          <span>Profile</span>
        </Link>
      </nav>
    </main>
  )
}

export default WalletPage
