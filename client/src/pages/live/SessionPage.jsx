import './SessionPage.css'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BetSlipPanel from '../dashboard/components/BetSlipPanel'
import { get, post } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { cricketMatches } from '../dashboard/dashboardData'

const sessionRows = [
  { title: 'Current over runs', note: 'Over 17 · Live session', lines: [['0 - 4', '1.72', '2.05'], ['5 - 7', '2.40', '1.54'], ['8+', '3.45', '1.24']] },
  { title: 'Next over runs', note: 'Over 18 · Pre-ball market', lines: [['0 - 5', '1.64', '2.15'], ['6 - 8', '2.22', '1.62'], ['9+', '3.70', '1.20']] },
  { title: 'Team total runs', note: 'Innings session · 20 overs', lines: [['Under 159.5', '1.88', ''], ['159.5 - 169.5', '2.10', ''], ['Over 169.5', '1.76', '']] },
]

function SessionPage() {
  const { id } = useParams()
  const { token, refreshUser } = useAuth()
  const [match, setMatch] = useState(null)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    get('/api/external/cricket')
      .then((data) => {
        if (!mounted) return
        const matches = Array.isArray(data) ? data : []
        const index = Number.parseInt(id, 10)
        setMatch(matches[index] || cricketMatches[index] || null)
      })
      .catch(() => {
        const index = Number.parseInt(id, 10)
        if (mounted) setMatch(cricketMatches[index] || null)
      })
      .finally(() => mounted && setLoading(false))

    return () => { mounted = false }
  }, [id])

  const teams = useMemo(() => (match?.title || 'Mumbai Indians vs Chennai Super Kings').split(' vs '), [match])
  const score = Array.isArray(match?.score) ? match.score.map((item) => `${item.r}/${item.w} (${item.o})`).join(' · ') : (match?.score || '142/6 · 16.3')

  function selectMarket(label, odds, marketTitle) {
    setSelected({ market: label, detail: `${marketTitle} · ${match.title}`, selection: label, odds })
    setStatus('')
  }

  async function confirmBet({ stake }) {
    if (!selected) return
    try {
      const response = await post('/api/bets', {
        matchId: match.id || match.title,
        matchTitle: match.title,
        selection: selected.selection,
        amount: Number(stake),
        odds: selected.odds,
      }, token)
      if (response?.user) refreshUser(response.user)
      setSelected(null)
      setStatus('Bet confirmed successfully.')
    } catch (error) {
      setStatus(error.message || 'Could not confirm bet.')
    }
  }

  if (loading) return <div className="session-state">Loading session...</div>
  if (!match) return <div className="session-state">Session not found. <Link to="/live-cricket">Back to live cricket</Link></div>

  return (
    <main className="session-page">
      <header className="session-header">
        <div className="session-header-top">
          <Link to="/live-cricket" className="session-back" aria-label="Back to live cricket"><span className="material-symbols-outlined">arrow_back</span></Link>
          <div className="session-event-heading">
            <span className="session-kicker"><i /> Live cricket session</span>
            <h1>{match.title}</h1>
            <p>{match.league || 'Cricket'} <span>·</span> {match.minute || 'In play'}</p>
          </div>
          <div className="session-live-badge"><i /> LIVE</div>
        </div>
        <div className="session-scorebar">
          <div className="session-team"><span>{teams[0]}</span><strong>{score.split(' · ')[0] || '-'}</strong></div>
          <div className="session-score-center"><span>Current innings</span><strong>17.3 overs</strong><small>Session markets updating</small></div>
          <div className="session-team is-away"><span>{teams[1]}</span><strong>{score.split(' · ')[1] || '-'}</strong></div>
        </div>
      </header>

      <div className="session-layout">
        <section className="session-main">
          <div className="session-toolbar">
            <div><span className="session-kicker">Markets board</span><h2>Session odds</h2></div>
            <button type="button" className="session-refresh"><span className="material-symbols-outlined">sync</span> Auto refresh</button>
          </div>

          <div className="session-notice"><span className="material-symbols-outlined">bolt</span><p><strong>Fast market</strong> Odds can change while the bowler is running in. Your selection is confirmed at the price shown.</p></div>

          <div className="session-market-list">
            {sessionRows.map((market) => (
              <article className="session-market-card" key={market.title}>
                <div className="session-market-title"><div><h3>{market.title}</h3><p>{market.note}</p></div><span className="material-symbols-outlined">more_horiz</span></div>
                <div className="session-table-head"><span>Runs / line</span><span>Over</span><span>Under</span></div>
                {market.lines.map(([label, over, under]) => (
                  <div className="session-market-row" key={label}>
                    <strong>{label}</strong>
                    <button type="button" disabled={!over} onClick={() => selectMarket(`${market.title} · Over ${label}`, over, market.title)}><span>Back</span>{over || '—'}</button>
                    <button type="button" className="is-under" disabled={!under} onClick={() => selectMarket(`${market.title} · Under ${label}`, under, market.title)}><span>Back</span>{under || '—'}</button>
                  </div>
                ))}
              </article>
            ))}
          </div>

          <div className="session-secondary-markets">
            <div className="session-toolbar"><div><span className="session-kicker">More markets</span><h2>Match lines</h2></div></div>
            <div className="session-quick-grid">
              {(match.odds || [{ label: teams[0], value: '1.85' }, { label: teams[1], value: '2.10' }]).map((odd) => <button type="button" key={odd.label} onClick={() => selectMarket(odd.label, odd.value, 'Match winner')}><span>{odd.label}</span><strong>{odd.value}</strong></button>)}
            </div>
          </div>
        </section>

        <aside className="session-slip"><BetSlipPanel items={selected ? [selected] : []} onConfirmBet={confirmBet} onClearSlip={() => setSelected(null)} statusMessage={status} /></aside>
      </div>
    </main>
  )
}

export default SessionPage
