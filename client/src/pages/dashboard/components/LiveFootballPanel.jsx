import { footballMatches } from '../dashboardData'

function LiveFootballPanel() {
  return (
    <>
      {footballMatches.map((match, matchIndex) => {
        const teams = match.title.split(' vs ')
        return (
          <article className="reference-match-card glass" id={matchIndex === 0 ? 'live-football' : undefined} key={match.title}>
            <div className="reference-match-meta"><span>{match.league}</span><span className="reference-live-pill"><i /> LIVE</span><span>{match.minute}</span></div>
            <div className="reference-match-score"><div><span className="team-badge">{teams[0].slice(0, 3).toUpperCase()}</span><small>{teams[0]}</small></div><strong>{match.score}</strong><div><span className="team-badge">{teams[1].slice(0, 3).toUpperCase()}</span><small>{teams[1]}</small></div></div>
            <div className="reference-odds-row">{match.odds.map((odd, index) => <button type="button" key={odd.label}><small>{index === 0 ? '1' : index === 1 ? 'X' : '2'}</small><strong>{odd.value}</strong></button>)}</div>
          </article>
        )
      })}
    </>
  )
}

export default LiveFootballPanel
