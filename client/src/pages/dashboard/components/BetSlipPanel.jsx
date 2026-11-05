import './BetSlipPanel.css'
import { Link } from 'react-router-dom'
import { betSlipItems } from '../dashboardData'
import { post } from '../../../api/api'
import { useAuth } from '../../../context/AuthContext'
import { useState } from 'react'

function BetSlipPanel({ items, onConfirmBet, onClearSlip, statusMessage = '' }) {
  const list = items === undefined ? betSlipItems : items
  const [status, setStatus] = useState('')
  const { token } = useAuth()
  const hasSelection = list.length > 0

  async function savePrediction() {
    if (!hasSelection) return
    if (onConfirmBet) {
      await onConfirmBet({ items: list })
      return
    }
    setStatus('Saving free prediction…')
    try {
      const item = list[0]
      await post('/api/bets', {
        matchId: item.matchId || item.detail || item.market,
        matchTitle: item.matchTitle || item.detail || item.market,
        selection: item.selection || item.market,
        odds: Number(item.odds) || 1,
      }, token)
      setStatus('Free prediction saved.')
      onClearSlip?.()
    } catch (error) {
      setStatus(error.message || 'Could not save prediction.')
    }
  }

  return <section className="bet-slip glass" id="bet-slip">
    <div className="bet-slip-header"><div><h2>Free prediction</h2><p>{list.length} selection{list.length === 1 ? '' : 's'} · no coins or money used.</p></div><span className="slip-count">{list.length}</span></div>
    <div className="bet-slip-items">{hasSelection ? list.map((item, i) => <article className="slip-item" key={`${item.market}-${i}`}><div><h3>{item.market}</h3><p>{item.detail}</p></div><strong>{item.odds}</strong></article>) : <div className="bet-slip-empty">Choose a result to record a free prediction.</div>}</div>
    <div className="slip-actions"><button className="confirm-bet" type="button" onClick={savePrediction} disabled={!hasSelection}><span className="material-symbols-outlined">check_circle</span>Save prediction</button><button className="slip-secondary" type="button" onClick={() => onClearSlip?.()}>Clear</button></div>
    {(status || statusMessage) && ((status || statusMessage).includes('saved') ? <Link className="bet-slip-status" role="status" to="/history">{status || statusMessage} →</Link> : <p className="bet-slip-status" role="status">{status || statusMessage}</p>)}
  </section>
}

export default BetSlipPanel
