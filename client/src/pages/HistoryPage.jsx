import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/wallet'
import './HistoryPage.css'

function HistoryPage() {
  const { token } = useAuth()
  const [bets, setBets] = useState([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    get('/api/bets', token).then((data) => setBets(Array.isArray(data) ? data : [])).catch((err) => setError(err.message))
  }, [token])

  const visibleBets = bets.filter((bet) => filter === 'all' || (filter === 'live' ? bet.status === 'pending' : ['won', 'lost', 'cancelled'].includes(bet.status)))

  return (
    <main className="history-page">
      <header className="history-topbar glass"><div className="history-topbar-inner"><Link className="history-back" to="/dashboard" aria-label="Back to dashboard">←</Link><div><span className="history-kicker">BKR activity center</span><h1>Bet History</h1></div><Link className="history-wallet-link" to="/wallet">Wallet</Link></div></header>
      <div className="history-shell">
        <section className="history-hero glass"><div><span className="history-kicker">Everything in one place</span><h2>Live & settled bets</h2><p>Track every confirmed selection, active live bet, stake, odds, and settlement result.</p></div><div className="history-counts"><strong>{bets.length}</strong><span>Total bets</span><strong>{bets.filter((bet) => bet.status === 'pending').length}</strong><span>Live now</span></div></section>
        <section className="history-card glass">
          <div className="history-toolbar"><div><h3>Activity</h3><p>{error || 'Your latest betting activity'}</p></div><div className="history-filters" role="tablist" aria-label="Bet history filters">{['all', 'live', 'settled'].map((item) => <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All bets' : item === 'live' ? 'Live bets' : 'Settled'}</button>)}</div></div>
          <div className="history-list">
            {visibleBets.map((bet) => { const live = bet.status === 'pending'; return <article className={`history-row ${live ? 'is-live' : ''}`} key={bet._id}><div className="history-row-main"><span className="history-sport-icon material-symbols-outlined">{live ? 'sensors' : 'receipt_long'}</span><div><h4>{bet.match}</h4><p>{bet.selection} · {bet.placedAt ? new Date(bet.placedAt).toLocaleString('en-IN') : 'Recently placed'}</p></div></div><div className="history-value"><span>Odds</span><strong>{Number(bet.odds).toFixed(2)}x</strong></div><div className="history-value"><span>Stake</span><strong>{formatCurrency(bet.amount)}</strong></div><span className={`history-status is-${bet.status}`}>{live ? 'LIVE' : String(bet.status).toUpperCase()}</span></article> })}
            {!visibleBets.length ? <div className="history-empty"><span className="material-symbols-outlined">history</span><h3>No bets in this view</h3><p>Confirmed bets will appear here automatically.</p><Link to="/live-markets">Explore live markets</Link></div> : null}
          </div>
        </section>
      </div>
    </main>
  )
}

export default HistoryPage
