import './LiveMatchesPanel.css'
import { Link } from 'react-router-dom'
import { cricketMatches } from '../dashboardData'

function LiveCricketPanel() {
  const preview = cricketMatches.slice(0, 3)

  return (
    <section className="dashboard-panel glass" id="live-cricket">
      <div className="panel-header">
        <div>
          <h2>Live Cricket</h2>
          <p>Live cricket matches and winning lines.</p>
        </div>
        <div className="panel-header-meta">
          <span className="panel-live-count">
            <span className="chip-dot" />
            {cricketMatches.length} live
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
        <Link to="/live-cricket" className="primary-btn">
          Open Live Cricket
        </Link>
      </div>
    </section>
  )
}

export default LiveCricketPanel
