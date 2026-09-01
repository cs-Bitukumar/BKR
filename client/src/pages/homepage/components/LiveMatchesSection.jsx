import './LiveMatchesSection.css'
import { liveMatches } from '../homepageData'

function LiveMatchesSection() {
  return (
    <div className="glass matches">
      <div className="section-title">
        <div>
          <h2>Live Odds</h2>
          <p>
            Real-time match boards with compact odds controls and a dark glass finish.
          </p>
        </div>
      </div>

      <div className="matches-list">
        {liveMatches.map((match) => (
          <article className="match-card" key={`${match.home}-${match.away}`}>
            <div className="match-top">
              <div>
                <div className="match-league">{match.league}</div>
                <div className="live-pill match-pill">
                  <span className="chip-dot" />
                  {match.status}
                </div>
              </div>

              <div className="score">
                <strong>{match.score}</strong>
                <span>{match.minute}</span>
              </div>
            </div>

            <div className="match-mid">
              <div className="match-team">
                <strong>{match.home}</strong>
                <span>home side pressure</span>
              </div>

              <div className="match-team match-team-right">
                <strong>{match.away}</strong>
                <span>away side response</span>
              </div>
            </div>

            <div className="odds-row">
              {match.odds.map((odd) => (
                <button className="odds-btn" type="button" key={odd.label}>
                  <span className="odds-label">{odd.label}</span>
                  <span className="odds-value">{odd.value}</span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default LiveMatchesSection
