import './RecentBetsPanel.css'
import { recentBets } from '../dashboardData'
import { useEffect, useState } from 'react'
import { get } from '../../../api/api'
import { useAuth } from '../../../context/AuthContext'

function RecentBetsPanel() {
  const { token } = useAuth()
  const [bets, setBets] = useState(recentBets)
  useEffect(() => { get('/api/bets', token).then((data) => { if (Array.isArray(data) && data.length) setBets(data.slice(0, 5).map((bet) => ({ match: bet.match, market: bet.selection, odds: bet.odds, profit: bet.status === 'won' ? 'Won' : '—', result: bet.status || 'pending', stake: `₹${Number(bet.amount).toFixed(2)}` }))) }).catch(() => {}) }, [token])
  return (
    <section className="dashboard-panel glass" id="bet-history">
      <div className="panel-header">
        <div>
          <h2>Recent Bets</h2>
          <p>Latest slip history from the active session.</p>
        </div>
        <button className="panel-filter" type="button" aria-label="Filter bets">
          <span className="material-symbols-outlined">filter_alt</span>
        </button>
      </div>

      <div className="bets-table">
        <div className="bets-table-head">
          <span>Bet</span>
          <span>Market</span>
          <span>Status</span>
          <span>Stake</span>
        </div>

        {bets.map((bet) => (
          <article className="bets-table-row" key={`${bet.match}-${bet.market}`}>
            <div className="bet-match-copy">
              <strong>{bet.match}</strong>
              <span>{bet.odds}</span>
            </div>
            <div className="bet-market-copy">
              <span>{bet.market}</span>
              <strong>{bet.profit}</strong>
            </div>
            <span className={`bet-result is-${bet.result.toLowerCase()}`}>{bet.result}</span>
            <div className="bet-stake-copy">
              <strong>{bet.stake}</strong>
              <span>Placed</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default RecentBetsPanel

