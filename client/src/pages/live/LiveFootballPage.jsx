import './LiveMarketPage.css'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BetSlipPanel from '../dashboard/components/BetSlipPanel'
import { get, post } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, readWalletState, recordBetPlacement } from '../../utils/wallet'

function LiveFootballPage() {
  const { user, token, refreshUser } = useAuth()
    const walletState = readWalletState(user)
    const balanceLabel = formatCurrency(walletState.balance)

  const [selectedBet, setSelectedBet] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [favorites, setFavorites] = useState(() => new Set())
  const [betStatus, setBetStatus] = useState('')
  const [placingBet, setPlacingBet] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadMatches = () => get('/api/external/football')
      .then((data) => {
        if (!mounted) return

        setMatches(Array.isArray(data) ? data : [])
        setError(null)
      })
      .catch((err) => {
        console.error(err)

        if (!mounted) return

        setError('Failed to load football matches')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    loadMatches()
    const refreshTimer = window.setInterval(loadMatches, 30000)

    return () => {
      mounted = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  function handleSelectBet(match, odd) {
    setBetStatus('')
    setSelectedBet({
      matchId: match.id || match.title,
      matchTitle: match.title,
      market: odd.label,
      odds: odd.value,
    })
  }

  async function handleConfirmBet({ stake }) {
    if (!selectedBet || placingBet) return
    const amount = Number(stake)
    if (!Number.isFinite(amount) || amount <= 0) return setBetStatus('Please enter a valid bet amount.')
    setPlacingBet(true)
    setBetStatus('Placing bet...')
    try {
      const response = await post('/api/bets', { matchId: selectedBet.matchId, matchTitle: selectedBet.matchTitle, selection: selectedBet.market, amount, odds: selectedBet.odds }, token)
      if (response.user) refreshUser(response.user)
      recordBetPlacement(user, amount, { matchTitle: selectedBet.matchTitle, marketTitle: selectedBet.market, selection: selectedBet.market })
      setSelectedBet(null)
      setBetStatus('Bet confirmed successfully.')
    } catch (error) {
      setBetStatus(error.message || 'Could not confirm bet.')
    } finally {
      setPlacingBet(false)
    }
  }

  return (
    <main className="live-page">
      <header className="live-topbar glass">
        <div className="live-topbar-inner">
          <div
            className="live-brand-copy"
            style={{ padding: '12px 48px' }}
          >
            <span className="material-symbols-outlined live-brand-icon">
              sports_soccer
            </span>

            <div>
              <h1>Live Football</h1>
              <p>
                All active football matches and betting markets.
              </p>
            </div>
          </div>
          <div>{balanceLabel}</div>

        </div>
      </header>

      <div className="live-shell">
        <section className="live-list grid">
          {loading ? (
            <div className="loading">
              Loading football matches...
            </div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : matches.length === 0 ? (
            <div className="loading">
              No football matches available
            </div>
          ) : (
            matches.map((match, idx) => {
              const teams = (match.title || '').split(' vs ')
              const home = teams[0] || ''
              const away = teams[1] || ''

              return (
                <article
  className="live-match-card"
  key={match.id || `${match.title}-${idx}`}
>
                  <div className="match-top-row">
                    <div className="match-league">{match.league}</div>

                    <div className="match-datetime">
                      {match.date || match.minute}
                    </div>

                    <button className="fav-star" aria-label="favorite" type="button" onClick={() => setFavorites((current) => { const next = new Set(current); const key = match.id || match.title; next.has(key) ? next.delete(key) : next.add(key); return next })}>
                      {favorites.has(match.id || match.title) ? '★' : '☆'}
                    </button>
                  </div>

                  <div className="match-teams">
                    <div className="team-col">
                      <div className="team-logo">{home.charAt(0)}</div>

                      <div className="team-name">{home}</div>

                      <div className="team-score">
  {match.score || "-"}
</div>
                    </div>

                    <div className="match-vs">
                      <div className="vs-text">VS</div>

                      <div className="match-info">{match.minute}</div>
                    </div>

                    <div className="team-col right">
                      <div className="team-logo">{away.charAt(0)}</div>

                      <div className="team-name">{away}</div>

                      <div className="team-score">
  {match.score || "-"}
</div>
                    </div>
                  </div>

                  <div className="match-bottom">
                    <div className="market-odds">
                      {(match.odds || []).map((odd) => (
                        <div
                          key={odd.label}
                          className="odds-pill compact"
                          onClick={() => handleSelectBet(match, odd)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="odds-label">{odd.label}</div>

                          <div className="odds-value">{odd.value}</div>
                        </div>
                      ))}

                      <Link to={`/live-football/${idx}`} className="session">
                        Session
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <aside>
          <BetSlipPanel
            items={
              selectedBet
                ? [
                    {
                      market: selectedBet.market,
                      detail: selectedBet.matchTitle,
                      odds: selectedBet.odds,
                    },
                  ]
                : []
            }
            onConfirmBet={handleConfirmBet}
            onClearSlip={() => setSelectedBet(null)}
            statusMessage={betStatus}
          />
        </aside>
      </div>
    </main>
  )
}

export default LiveFootballPage
