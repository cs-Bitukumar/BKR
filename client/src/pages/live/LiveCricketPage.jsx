import './LiveMarketPage.css'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BetSlipPanel from '../dashboard/components/BetSlipPanel'
import { get, post } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, readWalletState, recordBetPlacement } from '../../utils/wallet'
import { getScorecard } from '../../api/sportsApi'

function parseTeamScores(match) {
  if (Array.isArray(match?.score)) {
    return match.score
      .map((entry) => {
        if (!entry) return ''
        if (typeof entry === 'string') return entry.trim()
        return `${entry.r ?? ''}/${entry.w ?? ''} (${entry.o ?? ''})`.trim()
      })
      .filter(Boolean)
  }

  if (typeof match?.score === 'string') {
    return match.score
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return []
}

function isLiveMatch(match) {
  const status = String(match?.status || match?.minute || '').toLowerCase()
  return Boolean(match?.isLive) || /live|in progress|innings break|day \d|stumps/.test(status)
}

function getBallLabel(match) {
  const ball = match?.ball || match?.currentBall
  if (ball) return ball

  const statusBall = String(match?.minute || '').match(/\d+(?:\.\d+)?\s*overs?/i)
  return statusBall?.[0] || '-'
}

function getLiveDetails(scorecardResponse, match) {
  const data = scorecardResponse?.data || scorecardResponse || {}
  const innings = data.scorecard || data.scoreCard || []
  const currentInning = Array.isArray(innings) ? innings[innings.length - 1] : {}
  const bowlers = currentInning?.bowlTeamDetails?.bowlersData
  const bowlerList = bowlers && typeof bowlers === 'object' ? Object.values(bowlers) : []
  const currentBowler = currentInning?.currentBowler || currentInning?.bowler || bowlerList[bowlerList.length - 1]
  const recentBalls = match.recentBalls || match.balls || currentInning?.recentBalls || currentInning?.balls || currentInning?.lastOver?.balls || []
  const balls = Array.isArray(recentBalls)
    ? recentBalls.map((ball) => typeof ball === 'object' ? ball.runs ?? ball.score ?? ball.value ?? '' : ball).filter((ball) => ball !== '')
    : String(recentBalls).split(/[\s,|]+/).filter(Boolean)

  return {
    ball: match.currentBall || match.ball || currentInning?.currentBall || currentInning?.ball || currentInning?.o || currentInning?.overs || '',
    bowler: match.bowler || currentBowler?.bowlName || currentBowler?.name || currentBowler?.bowlerName || '',
    balls,
  }
}

function LiveCricketPage() {
  const { user, token, refreshUser } = useAuth()
  const walletState = readWalletState(user)
  const balanceLabel = formatCurrency(walletState.balance)
  const [selectedBet, setSelectedBet] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [betStatus, setBetStatus] = useState('')
  const [placingBet, setPlacingBet] = useState(false)
  const [favorites, setFavorites] = useState(() => new Set())


  useEffect(() => {
    let mounted = true
    const loadMatches = () => get('/api/external/cricket')
      .then(async (data) => {
        if (!mounted) return
        const liveMatches = Array.isArray(data) ? data : []
        const enrichedMatches = await Promise.all(liveMatches.map(async (match) => {
          if (!match.id) return match

          try {
            const scorecardResponse = await getScorecard(match.id)
            const scorecard = scorecardResponse?.data?.scorecard || scorecardResponse?.data?.scoreCard
            if (!Array.isArray(scorecard) || scorecard.length === 0) return match

            const liveScores = scorecard
              .map((inning) => {
                if (!inning) return ''
                const runs = inning.r ?? inning.runs
                const wickets = inning.w ?? inning.wickets
                const overs = inning.o ?? inning.overs
                if (runs == null && wickets == null && overs == null) return ''
                return `${runs ?? '-'}${wickets != null ? `/${wickets}` : ''}${overs != null ? ` (${overs})` : ''}`
              })
              .filter(Boolean)

            const liveDetails = getLiveDetails(scorecardResponse, match)
            return liveScores.length ? { ...match, score: liveScores.join(' | '), ...liveDetails } : { ...match, ...liveDetails }
          } catch (scorecardError) {
            console.warn(`Scorecard unavailable for match ${match.id}`, scorecardError)
            return match
          }
        }))

        if (!mounted) return
        setMatches(enrichedMatches)
        setError(null)
      })
      .catch((err) => {
        console.error(err)
        if (!mounted) return
        setError(err.message || 'Failed to load matches')
      })
      .finally(() => mounted && setLoading(false))

    loadMatches()
    const refreshTimer = window.setInterval(loadMatches, 30000)

    return () => {
      mounted = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  function handleSelectBet(match, o) {
    setBetStatus('')
    setSelectedBet({
      matchId: match.id || match.title,
      matchTitle: match.title,
      market: o.label,
      selection: o.label,
      odds: o.value,
    })
  }

  function clearSlip() {
    setSelectedBet(null)
    setBetStatus('')
  }

  async function handleConfirmBet({ stake }) {
    if (!selectedBet) return

    const amount = Number(stake)
    if (!Number.isFinite(amount) || amount <= 0) {
      setBetStatus('Please enter a valid bet amount.')
      return
    }

    if (placingBet) return

    setPlacingBet(true)
    setBetStatus('Placing bet...')

    try {
      const response = await post(
        '/api/bets',
        {
          matchId: selectedBet.matchId,
          matchTitle: selectedBet.matchTitle,
          selection: selectedBet.selection,
          amount,
          odds: selectedBet.odds,
        },
        token,
      )

      if (response?.user) {
        refreshUser(response.user)
      }

      recordBetPlacement(user, amount, {
        matchTitle: selectedBet.matchTitle,
        marketTitle: selectedBet.market,
        selection: selectedBet.selection,
      })

      setBetStatus('Bet confirmed successfully.')
      setSelectedBet(null)
    } catch (err) {
      setBetStatus(err.message || 'Could not confirm bet.')
    } finally {
      setPlacingBet(false)
    }
  }

  const slipItems = useMemo(() => {
    if (!selectedBet) return []

    return [
      {
        market: selectedBet.market,
        detail: selectedBet.matchTitle,
        odds: selectedBet.odds,
      },
    ]
  }, [selectedBet])

  return (
    <main className="live-page">
      <header className="live-topbar glass">
        <div className="live-topbar-inner">
          <div className="live-brand-copy" style={{ padding: '12px 48px' }}>
            <span className="material-symbols-outlined live-brand-icon">sports_cricket</span>
            <div>
              <h1>Live Cricket</h1>
              <p>All active cricket matches and betting markets.</p>
            </div>
          </div>

          <div className="live-wallet-balance">
            <p>Available Balance</p>
            <h1>{balanceLabel}</h1></div>
        </div>
      </header>

      <div className="live-shell">
        <section className="live-list grid">
          {loading ? (
            <div className="loading">Loading matches...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            matches.map((match, idx) => {
              const teams = (match.title || '').split(' vs ')
              const home = teams[0] || 'Team A'
              const away = teams[1] || 'Team B'
              const teamScores = parseTeamScores(match)
              const live = isLiveMatch(match)
              const liveScore = teamScores.join(' | ') || match.score || '-'

              return (
                <article className="live-match-card" key={match.id || match.title || idx}>
                  <div className="match-top-row">
                    <div className="match-league">{match.league}</div>
                    <div className="match-datetime">{match.date || match.minute}</div>
                    <button className="fav-star" aria-label="favorite" type="button" onClick={() => setFavorites((current) => { const next = new Set(current); const key = match.id || match.title; next.has(key) ? next.delete(key) : next.add(key); return next })}>
                      {favorites.has(match.id || match.title) ? '★' : '☆'}
                    </button>
                  </div>

                  <div className="match-teams">
                    <div className="team-col">
                      <div className="team-logo">{home.charAt(0)}</div>
                      <div className="team-name">{home}</div>
                      <div className="team-score">{teamScores[0] || '-'}</div>
                    </div>

                    <div className={`match-vs ${live ? 'is-live-summary' : ''}`}>
                      {live ? (
                        <>
                          <div className="live-score-summary">{liveScore}</div>
                          <div className="live-balls-row">
                            <strong>{match.bowler || 'Bowler'}:</strong>
                            <span>{match.balls?.length ? match.balls.join(' ') : getBallLabel(match)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="vs-text">VS</div>
                          <div className="match-info">{match.minute}</div>
                        </>
                      )}
                    </div>

                    <div className="team-col right">
                      <div className="team-logo">{away.charAt(0)}</div>
                      <div className="team-name">{away}</div>
                      <div className="team-score">{teamScores[1] || '-'}</div>
                    </div>
                  </div>

                  <div className="match-bottom">
                    <div className="market-odds">
                      {(match.odds || []).map((o) => (
                        <div
                          className="odds-pill compact"
                          key={o.label}
                          onClick={() => handleSelectBet(match, o)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="odds-label">{o.label}</div>
                          <div className="odds-value">{o.value}</div>
                        </div>
                      ))}

                      <Link to={`/session/${idx}`} className="session">
                        Session
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>

        <aside>
          <BetSlipPanel
            items={slipItems}
            onConfirmBet={handleConfirmBet}
            onClearSlip={clearSlip}
            statusMessage={betStatus}
          />
        </aside>
      </div>
    </main>
  )
}

export default LiveCricketPage
