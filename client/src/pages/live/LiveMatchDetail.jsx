import './LiveMarketPage.css'
import { useParams, Link } from 'react-router-dom'
import { liveMatches } from '../dashboard/dashboardData'

function LiveMatchDetail() {
  const { id } = useParams()
  const idx = parseInt(id, 10)
  const match = liveMatches[idx]

  if (!match) {
    return (
      <main className="live-market-page">
        <header className="live-market-header">
          <h1>Match not found</h1>
          <p className="lead">The match you're looking for doesn't exist.</p>
        </header>
        <div style={{ padding: 24 }}>
          <Link to="/live-markets" className="primary-btn">Back to Live Markets</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="live-market-page">
      <header className="live-market-header">
        <h1>{match.title}</h1>
        <p className="lead">{match.league} · {match.minute} · {match.score}</p>
      </header>

      <section className="live-detail">
        <div className="detail-left">
          <div className="detail-block">
            <h4>Trend</h4>
            <p>{match.trend}</p>
          </div>

          <div className="detail-block">
            <h4>Volume</h4>
            <p>{match.volume}</p>
          </div>

          <div className="detail-block">
            <h4>Odds</h4>
            <div className="odds-grid">
              {match.odds.map((o) => (
                <div className="odds-item" key={o.label}>
                  <strong>{o.value}</strong>
                  <span>{o.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="detail-actions">
          <div className="card glass">
            <h4>Place a bet</h4>
            <p>Quick stake and add to slip (integration pending).</p>
            <button className="primary-btn" type="button">Add to slip</button>
            <Link to="/live-markets" style={{ display: 'block', marginTop: 12 }}>Back</Link>
          </div>
        </aside>
      </section>
    </main>
  )
}

export default LiveMatchDetail
