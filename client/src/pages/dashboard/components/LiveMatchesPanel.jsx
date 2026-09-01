import './LiveMatchesPanel.css'
import { Link } from 'react-router-dom'
import { liveMatches } from '../dashboardData'

function LiveMatchesPanel() {
  const preview = liveMatches.slice(0, 3)

  return (
    <section className="dashboard-panel glass" id="live-markets">
      <div className="panel-header">
        <div>
          <h2>Live Markets</h2>
          <p>Momentum snapshots and betting lines that are moving right now.</p>
        </div>
        <div className="panel-header-meta">
          <span className="panel-live-count">
            <span className="chip-dot" />
            {liveMatches.length} live
          </span>
          <a className="panel-link" href="#analytics">
            View insights
          </a>
        </div>
      </div>

      <div className="live-match-list live-preview">
        {preview.map((match) => (
          <article className="live-match-card compact" key={match.title}>
            <div className="live-match-top">
              <div>
                <div className="match-league">{match.league}</div>
                <div className="live-pill">
                  <span className="chip-dot" />
                  {match.status}
                </div>
              </div>
              <div className="score-block">
                <strong>{match.score}</strong>
                <span>{match.minute}</span>
              </div>
            </div>

            <h3>{match.title}</h3>

            <div className="match-meta-row">
              <span>{match.trend}</span>
              <span>{match.volume}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="live-preview-actions">
        <Link to="/live-markets" className="primary-btn">
          Open Live Markets
        </Link>
      </div>
    </section>
  )
}

export default LiveMatchesPanel

