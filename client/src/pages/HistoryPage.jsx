import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../api/api'
import { useAuth } from '../context/AuthContext'
import './HistoryPage.css'

function HistoryPage() {
  const { token } = useAuth()
  const [predictions, setPredictions] = useState([])
  const [error, setError] = useState('')
  useEffect(() => { get('/api/bets', token).then((data) => setPredictions(Array.isArray(data) ? data : [])).catch((err) => setError(err.message)) }, [token])
  return <main className="history-page">
    <header className="history-topbar glass"><div className="history-topbar-inner"><Link className="history-back" to="/dashboard" aria-label="Back to dashboard">←</Link><div><span className="history-kicker">BKR activity center</span><h1>Prediction History</h1></div><Link className="history-wallet-link" to="/wallet">Virtual coins</Link></div></header>
    <div className="history-shell">
      <section className="history-hero glass"><div><span className="history-kicker">Everything in one place</span><h2>Free predictions</h2><p>Review saved picks. Predictions do not use coins and have no prizes.</p></div><div className="history-counts"><strong>{predictions.length}</strong><span>Total picks</span><strong>0</strong><span>Prizes</span></div></section>
      <section className="history-card glass"><div className="history-toolbar"><div><h3>Activity</h3><p>{error || 'Saved entertainment predictions'}</p></div></div><div className="history-list">
        {predictions.map((pick) => <article className="history-row" key={pick._id}><div className="history-row-main"><span className="history-sport-icon material-symbols-outlined">sports</span><div><h4>{pick.match}</h4><p>{pick.selection} · {pick.placedAt ? new Date(pick.placedAt).toLocaleString('en-IN') : 'Recently saved'}</p></div></div><div className="history-value"><span>Odds</span><strong>{Number(pick.odds).toFixed(2)}x</strong></div><div className="history-value"><span>Cost</span><strong>Free</strong></div><span className="history-status">SAVED</span></article>)}
        {!predictions.length && <div className="history-empty"><span className="material-symbols-outlined">history</span><h3>No predictions yet</h3><p>Saved free picks will appear here.</p><Link to="/live-markets">Explore match data</Link></div>}
      </div></section>
    </div>
  </main>
}
export default HistoryPage
