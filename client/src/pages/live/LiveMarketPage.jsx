import './LiveMarketPage.css'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BetSlipPanel from '../dashboard/components/BetSlipPanel'
import { get, post } from '../../api/api'
import { useAuth } from '../../context/AuthContext'

const filters = ['All Markets', 'Football', 'Cricket', 'Basketball']

function normalizeMarket(item, sport = 'Football') {
  const title = item.title || `${item.homeTeam || 'Home'} vs ${item.awayTeam || 'Away'}`
  const rawOdds = Array.isArray(item.odds) ? item.odds : [['Home', item.odds?.home], ['Draw', item.odds?.draw], ['Away', item.odds?.away]]
  const odds = rawOdds.map((odd) => Array.isArray(odd) ? { label: odd[0], value: odd[1] } : odd).filter((odd) => odd?.label && odd?.value && Number(odd.value) > 0)
  return { id: item.id || item._id || title, sport: item.sport || sport, league: item.league || item.matchType?.toUpperCase() || sport, title, score: typeof item.score === 'object' ? `${item.score.home ?? 0} - ${item.score.away ?? 0}` : item.score || '-', clock: item.minute || item.status || item.date || 'Live market', momentum: item.status || (item.isLive ? 'Live market' : 'Upcoming market'), volume: item.currentBall || item.date || 'Live data', odds }
}

function LiveMarketPage() {
  const [params] = useSearchParams()
  const { token, refreshUser } = useAuth()
  const [activeFilter, setActiveFilter] = useState('All Markets')
  const [marketFeed, setMarketFeed] = useState([])
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const query = (params.get('search') || '').toLowerCase().trim()

  useEffect(() => {
    let mounted = true
    async function loadMarkets() {
      const results = await Promise.allSettled([get('/api/external/football'), get('/api/external/cricket'), get('/api/matches')])
      if (!mounted) return
      const [football, cricket, database] = results
      const markets = [
        ...(football.status === 'fulfilled' && Array.isArray(football.value) ? football.value.map((item) => normalizeMarket(item, 'Football')) : []),
        ...(cricket.status === 'fulfilled' && Array.isArray(cricket.value) ? cricket.value.map((item) => normalizeMarket(item, 'Cricket')) : []),
        ...(database.status === 'fulfilled' && Array.isArray(database.value) ? database.value.filter((item) => item.status !== 'finished').map((item) => normalizeMarket(item, 'Football')) : []),
      ]
      const uniqueMarkets = [...new Map(markets.map((market) => [market.id, market])).values()]
      setMarketFeed(uniqueMarkets)
      setError(uniqueMarkets.length ? '' : 'No live markets are available right now.')
      setLoading(false)
    }
    loadMarkets()
    const timer = window.setInterval(loadMarkets, 30000)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [])

  const markets = useMemo(() => marketFeed.filter((market) => {
    const sportMatch = activeFilter === 'All Markets' || market.sport === activeFilter
    const text = `${market.title} ${market.league} ${market.momentum}`.toLowerCase()
    return sportMatch && (!query || text.includes(query))
  }), [activeFilter, marketFeed, query])

  function chooseMarket(match, odd) {
    setSelected({ matchId: match.id, matchTitle: match.title, market: odd.label, selection: odd.label, odds: odd.value })
    setStatus('')
  }

  async function confirmBet({ stake }) {
    if (!selected) return
    try {
      const response = await post('/api/bets', { matchId: selected.matchId, matchTitle: selected.matchTitle, selection: selected.selection, amount: Number(stake), odds: selected.odds }, token)
      if (response.user) refreshUser(response.user)
      setSelected(null)
      setStatus('Bet confirmed successfully.')
    } catch (err) { setStatus(err.message || 'Could not confirm bet.') }
  }

  const featured = markets[0]
  return (
    <main className="market-hub-page">
      <header className="market-hub-header">
        <div className="market-hub-brand-row"><Link className="market-hub-back" to="/dashboard" aria-label="Back to dashboard"><span className="material-symbols-outlined">arrow_back</span></Link><div><span className="market-hub-kicker">BKR / In-play desk</span><h1>Live Markets</h1></div><span className="market-hub-live"><i /> Live feed</span></div>
        <p>Live market data fetched from the available sports providers.</p>
      </header>
      <div className="market-hub-layout">
        <section className="market-hub-main">
          <div className="market-hub-toolbar">
            <div className="market-hub-filters" role="tablist" aria-label="Market sport filters">
              {filters.map((filter) => <button type="button" role="tab" aria-selected={activeFilter === filter} className={activeFilter === filter ? 'is-active' : ''} onClick={() => setActiveFilter(filter)} key={filter}>{filter}</button>)}
            </div>
            <span className="market-count">{loading ? 'Loading...' : `${markets.length} markets live`}</span>
          </div>
          <article className="market-feature-card">
            {featured ? <><div><span className="market-feature-kicker">Featured market · {featured.sport}</span><h2>{featured.title}</h2><p>{featured.momentum} · {featured.league}</p></div><div className="market-feature-score"><strong>{featured.score}</strong><span>{featured.clock}</span></div></> : <div><span className="market-feature-kicker">{loading ? 'Loading live data...' : activeFilter}</span><h2>{error || 'No matching market'}</h2><p>Live market information will appear here when available.</p></div>}
          </article>
          <div className="market-hub-list">
            {loading ? <div className="market-empty">Loading live markets...</div> : markets.map((market) => <article className="market-board-card" key={market.id}>
              <div className="market-board-top"><div><span className="market-board-league">{market.league}</span><h3>{market.title}</h3></div><span className="market-board-live"><i /> {market.clock}</span></div>
              <div className="market-board-middle"><div className="market-board-score"><strong>{market.score}</strong><span>{market.clock}</span></div><div className="market-board-insight"><span>Market pulse</span><strong>{market.momentum}</strong><small>{market.volume}</small></div></div>
              <div className="market-board-odds">{market.odds.map((odd) => <button type="button" key={odd.label} onClick={() => chooseMarket(market, odd)}><span>{odd.label}</span><strong>{odd.value}</strong><em>Back</em></button>)}</div>
            </article>)}
            {!loading && !markets.length && <div className="market-empty">{error || 'No live markets match your current filter.'}</div>}
          </div>
        </section>
        <aside className="market-hub-slip"><BetSlipPanel items={selected ? [{ market: selected.market, detail: selected.matchTitle, odds: selected.odds }] : []} onConfirmBet={confirmBet} onClearSlip={() => setSelected(null)} statusMessage={status} /></aside>
      </div>
    </main>
  )
}

export default LiveMarketPage
