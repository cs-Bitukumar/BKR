import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { get, post } from '../../api/api'
import { formatCoins } from '../../utils/wallet'
import './WalletPage.css'

function WalletPage() {
  const { user, token, refreshUser } = useAuth()
  const [wallet, setWallet] = useState({ virtualCoins: Number(user?.virtualCoins) || 0, transactions: [], dailyReward: null })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    let active = true
    get('/api/wallet', token).then((data) => {
      if (!active) return
      setWallet(data)
      refreshUser({ virtualCoins: data.virtualCoins })
    }).catch((error) => active && setStatus(error.message || 'Unable to load virtual coins.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [refreshUser, token])

  async function claimDailyBonus() {
    if (claiming || wallet.dailyReward?.claimedToday) return
    setStatus('')
    setClaiming(true)
    try {
      const result = await post('/api/wallet/rewards/daily', {}, token)
      setWallet((current) => ({
        ...current,
        virtualCoins: result.virtualCoins,
        dailyReward: result.dailyReward,
        transactions: result.duplicate ? current.transactions : [result.transaction, ...current.transactions],
      }))
      refreshUser({ virtualCoins: result.virtualCoins })
      setStatus(result.duplicate
        ? 'Your daily reward has already been claimed today.'
        : `Day ${result.transaction.rewardDay} reward claimed: +${result.dailyBonusCoins} free coins. Wallet balance: ${formatCoins(result.virtualCoins)}.`)
    } catch (error) {
      setStatus(error.message || 'Unable to claim your daily reward.')
    } finally {
      setClaiming(false)
    }
  }

  const dailyReward = wallet.dailyReward

  return (
    <main className="wallet-page">
      <header className="wallet-topbar glass"><div className="wallet-topbar-inner"><div className="wallet-topbar-brand"><Link className="wallet-back-btn" to="/dashboard" aria-label="Back to dashboard"><span className="material-symbols-outlined">arrow_back</span></Link><div className="wallet-brand-copy"><span className="material-symbols-outlined wallet-brand-icon">token</span><div><h1>VIRTUAL COINS</h1><p>Free gameplay credits</p></div></div></div></div></header>
      <div className="wallet-shell">
        <section className="virtual-wallet-card glass"><span>Available virtual coins</span><strong>{loading ? 'Loading…' : formatCoins(wallet.virtualCoins)}</strong><p>Coins have no monetary value. They cannot be bought, sold, transferred, redeemed, or withdrawn.</p></section>
        <section className="wallet-daily-reward glass" aria-labelledby="daily-reward-title">
          <div className="wallet-daily-reward-heading">
            <div><span className="wallet-reward-kicker">Daily login bonus</span><h2 id="daily-reward-title">Keep your streak alive</h2><p>Collect free virtual coins once per Indian calendar day.</p></div>
            <span className="material-symbols-outlined wallet-reward-icon" aria-hidden="true">redeem</span>
          </div>
          {dailyReward ? <>
            <div className="wallet-reward-stats">
              <div><span>Today's reward</span><strong>{formatCoins(dailyReward.todayRewardCoins)} <small>coins</small></strong><em>Day {dailyReward.rewardDay}</em></div>
              <div><span>Current streak</span><strong>{dailyReward.currentStreak}<small> {dailyReward.currentStreak === 1 ? 'day' : 'days'}</small></strong><em>{dailyReward.claimedToday ? 'Claimed today' : 'Consecutive days claimed'}</em></div>
              <div><span>Next reward</span><strong>{formatCoins(dailyReward.nextRewardCoins)} <small>coins</small></strong><em>Day {dailyReward.nextRewardDay}</em></div>
            </div>
            <div className="wallet-reward-days" aria-label="Seven-day daily reward schedule">
              {dailyReward.schedule.map(({ day, coins }) => {
                const isClaimed = dailyReward.claimedDays.includes(day)
                const isCurrent = dailyReward.rewardDay === day
                return <div className={`wallet-reward-day${isClaimed ? ' is-claimed' : ''}${isCurrent ? ' is-current' : ''}`} key={day} aria-current={isCurrent ? 'step' : undefined}>
                  <span>Day {day}</span><strong>{formatCoins(coins)}</strong><small>{isClaimed ? 'Claimed' : isCurrent ? 'Today' : 'Upcoming'}</small>
                  {isClaimed && <span className="material-symbols-outlined wallet-reward-check" aria-label="Claimed">check_circle</span>}
                </div>
              })}
            </div>
            <button className="wallet-primary-action wallet-claim-reward" type="button" onClick={claimDailyBonus} disabled={loading || claiming || dailyReward.claimedToday}>
              <span className="material-symbols-outlined" aria-hidden="true">{dailyReward.claimedToday ? 'check_circle' : 'redeem'}</span>
              {claiming ? 'Claiming…' : dailyReward.claimedToday ? 'Claimed today' : `Claim ${formatCoins(dailyReward.todayRewardCoins)} free coins`}
            </button>
            <p className="wallet-reward-note">Virtual coins only. Not purchasable, transferable, redeemable, or withdrawable.</p>
          </> : <p className="wallet-reward-loading">{loading ? 'Loading your reward schedule…' : 'Reward schedule is unavailable.'}</p>}
        </section>
        {status && <p className="wallet-feedback" role="status">{status}</p>}
        <section className="wallet-transactions-section"><div className="wallet-section-header"><h3>Virtual coin history</h3></div><div className="wallet-transaction-list">{wallet.transactions.length ? wallet.transactions.map((tx) => <article className="wallet-transaction-card glass" key={tx.transactionId}><div className="wallet-transaction-left"><div className="wallet-transaction-icon"><span className="material-symbols-outlined">{tx.type === 'daily_bonus' || tx.type === 'reward' ? 'redeem' : 'sports_esports'}</span></div><div><h4>{tx.description}</h4><p>{new Date(tx.createdAt).toLocaleString('en-IN')} · {tx.transactionId}</p></div></div><div className="wallet-transaction-right"><strong>{tx.amount > 0 ? '+' : ''}{formatCoins(tx.amount)}</strong><span>{formatCoins(tx.virtualCoinsBefore)} → {formatCoins(tx.virtualCoinsAfter)}</span></div></article>) : <p className="virtual-wallet-empty">No coin transactions yet. Daily bonuses and eligible in-game activity will appear here.</p>}</div></section>
      </div>
      <nav className="wallet-bottom-nav glass" aria-label="Wallet navigation"><Link className="wallet-bottom-nav-item" to="/dashboard"><span className="material-symbols-outlined">sports_esports</span><span>Lobby</span></Link><Link className="wallet-bottom-nav-item" to="/live-cricket"><span className="material-symbols-outlined">sports_cricket</span><span>Live</span></Link><Link className="wallet-bottom-nav-item is-active" to="/wallet" aria-current="page"><span className="material-symbols-outlined">token</span><span>Coins</span></Link><Link className="wallet-bottom-nav-item" to="/profile"><span className="material-symbols-outlined">person</span><span>Profile</span></Link></nav>
    </main>
  )
}

export default WalletPage
