import './BetSlipPanel.css'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { betSlipItems } from '../dashboardData'
import { post } from '../../../api/api'
import { useAuth } from '../../../context/AuthContext'

function BetSlipPanel({ items, onConfirmBet, onClearSlip, statusMessage = '' }) {
  const list = items === undefined ? betSlipItems : items
  const count = list.length
  const [stake, setStake] = useState(100)
  const [status, setStatus] = useState('')
  const { token, refreshUser } = useAuth()

  const totalOdds = useMemo(() => {
    return list.reduce((acc, item) => acc * (parseFloat(item.odds) || 1), 1)
  }, [list])

  const potentialReturn = useMemo(() => stake * totalOdds, [stake, totalOdds])
  const hasSelection = list.length > 0

  const fmt = (value) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

  async function handleConfirm() {
    if (!hasSelection) return
    if (onConfirmBet) {
      await onConfirmBet({ stake, items: list, totalOdds, potentialReturn })
      return
    }

    setStatus('Placing bet...')
    try {
      const item = list[0]
      const response = await post('/api/bets', {
        matchId: item.matchId || item.detail || item.market,
        matchTitle: item.matchTitle || item.detail || item.market,
        selection: item.selection || item.market,
        amount: stake,
        odds: Number(item.odds) || 1,
      }, token)
      if (response.user) refreshUser(response.user)
      setStatus('Bet confirmed successfully.')
      if (onClearSlip) onClearSlip()
    } catch (error) {
      setStatus(error.message || 'Could not confirm bet.')
    }
  }

  function handleClear() {
    if (onClearSlip) {
      onClearSlip()
      return
    }
    setStake(100)
  }

  return (
    <section className="bet-slip glass" id="bet-slip">
      <div className="bet-slip-header">
        <div>
          <h2>Bet Slip</h2>
          <p>
            {count} selection{count !== 1 ? 's' : ''} ready to confirm.
          </p>
        </div>
        <span className="slip-count">{count}</span>
      </div>

      <div className="slip-summary-badges">
        <span className="slip-badge">Parlay {totalOdds.toFixed(2)}x</span>
        <span className="slip-badge is-live">Live</span>
      </div>

      <div className="bet-slip-items">
        {hasSelection ? (
          list.map((item, i) => (
            <article className="slip-item" key={`${item.market}-${i}`}>
              <div>
                <h3>{item.market}</h3>
                <p>{item.detail}</p>
              </div>
              <strong>{item.odds}</strong>
            </article>
          ))
        ) : (
          <div className="bet-slip-empty">Select a market to prepare a bet.</div>
        )}
      </div>

      <div className="stake-box">
        <label htmlFor="stake">Bet amount</label>
        <div className="stake-input-wrap">
          <span className="stake-currency">₹</span>
          <input
            id="stake"
            type="number"
            min="10"
            step="10"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="quick-actions">
        <button type="button" onClick={() => setStake(25)}>
          25
        </button>
        <button type="button" onClick={() => setStake(50)}>
          50
        </button>
        <button type="button" onClick={() => setStake(100)}>
          100
        </button>
        <button type="button" onClick={() => setStake(1000)}>
          Max
        </button>
      </div>

      <div className="slip-summary">
        <div>
          <span>Potential return</span>
          <strong>{fmt(potentialReturn)}</strong>
        </div>
        <div>
          <span>Stake</span>
          <strong>{fmt(stake)}</strong>
        </div>
      </div>

      <div className="slip-actions">
        <button className="confirm-bet" type="button" onClick={handleConfirm} disabled={!hasSelection}>
          <span className="material-symbols-outlined">bolt</span>
          Confirm Bet
        </button>
        <button className="slip-secondary" type="button" onClick={handleClear}>
          Clear Slip
        </button>
      </div>
      {(status || statusMessage) ? (
        (status || statusMessage) === 'Bet confirmed successfully.' ? (
          <Link className="bet-slip-status" role="status" to="/history">
            {status || statusMessage} <span aria-hidden="true">→</span>
          </Link>
        ) : <p className="bet-slip-status" role="status">{status || statusMessage}</p>
      ) : null}

      {/* <div className="bet-slip-promo">
        <span className="promo-badge">Mega Bonus</span>
        <p>200% First Deposit bonus for new users.</p>
      </div> */}
    </section>
  )
}

export default BetSlipPanel
