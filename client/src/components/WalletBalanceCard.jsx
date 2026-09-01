import './WalletBalanceCard.css'

function WalletBalanceCard({
  balanceLabel,
  trendLabel,
  kicker = 'AVAILABLE BALANCE',
  className = '',
  icon = 'trending_up',
}) {
  return (
    <section className={`wallet-balance-card-shell glass ${className}`.trim()}>
      <p className="wallet-balance-card-kicker">{kicker}</p>
      <h2 className="wallet-balance-card-value">{balanceLabel}</h2>
      <div className="wallet-balance-card-trend">
        <span className="material-symbols-outlined">{icon}</span>
        <span>{trendLabel}</span>
      </div>
    </section>
  )
}

export default WalletBalanceCard
