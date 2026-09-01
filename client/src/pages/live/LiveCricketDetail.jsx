import './LiveMarketPage.css'
import { useParams, Link } from 'react-router-dom'
import BetSlipPanel from '../dashboard/components/BetSlipPanel'
import { useState, useEffect } from 'react'
import { get } from '../../api/api'

function LiveCricketDetail() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [slipItems, setSlipItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    get('/api/external/cricket')
      .then((data) => {
        if (!mounted) return
        const matches = Array.isArray(data) ? data : []
        const idx = parseInt(id, 10)
        if (Number.isFinite(idx) && matches[idx]) setMatch(matches[idx])
        else setMatch(null)
        setError(null)
      })
      .catch((err) => {
        console.error(err)
        if (!mounted) return
        setError(err.message || 'Failed to load match')
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [id])

  function addToSlip(o) {
    const item = { market: o.label, detail: match.title, odds: o.value }
    // keep only one selection at a time
    setSlipItems([item])
  }

  const marketGroups = match.sessionMarkets || (match.odds || []).map((odd) => ({
    title: odd.label || odd.name || 'Match market',
    thresholds: [odd.label || 'Price'],
    over: [odd.value || odd.price],
    under: [],
  }))

  if (loading) return <div className="center">Loading match…</div>
  if (error) return <div className="center error">{error}</div>
  if (!match) return <div className="center">Match not found</div>

  return (
    <main className="live-page">
      <header className="live-topbar glass">
        <div className="live-topbar-inner">
          <div className="live-brand-copy">
            <span className="material-symbols-outlined live-brand-icon">sports_cricket</span>
            <div>
              <h1>{match.title}</h1>
              <p>{match.league} • {match.minute}</p>
            </div>
          </div>
          <Link to="/dashboard" className="primary-link">Back</Link>
        </div>
      </header>

      <div className="live-shell">
        <section className="live-match-detail glass">
          <div className="match-summary">
            <div className="score-block">
              <strong>{match.score}</strong>
              <span>{match.minute}</span>
            </div>
            <p className="match-trend">{match.trend || ''}</p>
            <p className="match-volume">{match.volume || ''}</p>
          </div>

          <div className="bet-markets">
            <h3>Bet Markets</h3>
            <div className="markets-list">
              {/* Example layout matching provided screenshot: groups with Over / Threshold / Under columns */}
              {marketGroups.map((m, idx) => (
                <div className="market-group" key={m.title + idx}>
                  <div className="market-group-header">
                    <h4>{m.title}</h4>
                  </div>

                  <div className="market-grid">
                    <div className="market-col market-over">
                      <div className="market-col-title">Over</div>
                      <div className="market-list">
                        {m.over.map((od, i) => (
                          <button key={i} className="odds-pill vertical" onClick={() => addToSlip({ label: `${m.title} Over ${m.thresholds[i] || ''}`, value: od })}>{od}</button>
                        ))}
                      </div>
                    </div>

                    <div className="market-col market-mid">
                      <div className="market-col-title">Runs</div>
                      <div className="market-mid-list">
                        {m.thresholds.map((t, i) => (
                          <div key={i} className="threshold-item">{t}</div>
                        ))}
                      </div>
                    </div>

                    <div className="market-col market-under">
                      <div className="market-col-title">Under</div>
                      <div className="market-list">
                        {m.under.map((od, i) => (
                          <button key={i} className="odds-pill vertical under" onClick={() => addToSlip({ label: `${m.title} Under ${m.thresholds[i] || ''}`, value: od })}>{od}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside>
          <BetSlipPanel items={slipItems} />
        </aside>
      </div>
    </main>
  )
}

export default LiveCricketDetail
