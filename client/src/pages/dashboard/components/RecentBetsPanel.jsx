import './RecentBetsPanel.css'
import { useEffect, useState } from 'react'
import { get } from '../../../api/api'
import { useAuth } from '../../../context/AuthContext'

function RecentBetsPanel() {
  const { token } = useAuth()
  const [bets, setBets] = useState([])
  useEffect(() => { get('/api/bets', token).then((data) => { if (Array.isArray(data)) setBets(data.slice(0, 5).map((bet) => ({ match: bet.match, market: bet.selection, odds: bet.odds, result: bet.status || 'saved' }))) }).catch(() => {}) }, [token])
  return (
    <section className="dashboard-panel glass" id="bet-history">
      <div className="panel-header">
        <div>
          <h2>Recent free predictions</h2>
          <p>Saved picks for entertainment. No stake or prize.</p>
        </div>
        <button className="panel-filter" type="button" aria-label="Filter bets">
          <span className="material-symbols-outlined">filter_alt</span>
        </button>
      </div>

      <div className="bets-table">
        <div className="bets-table-head">
          <span>Match</span>
          <span>Pick</span>
          <span>Status</span>
          <span>Odds</span>
        </div>

        {bets.map((bet) => (
          <article className="bets-table-row" key={`${bet.match}-${bet.market}`}>
            <div className="bet-match-copy">
              <strong>{bet.match}</strong>
              <span>{bet.odds}</span>
            </div>
            <div className="bet-market-copy">
              <span>{bet.market}</span>
              <strong>Free pick</strong>
            </div>
            <span className={`bet-result is-${bet.result.toLowerCase()}`}>{bet.result}</span>
            <div className="bet-stake-copy">
              <strong>{bet.odds}</strong>
              <span>No coins used</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default RecentBetsPanel

