import { Link } from 'react-router-dom'

function LudoLobby({ joinCode, maxPlayers, timeMinutes, stake, stakeChoices, balance, balanceLabel, onJoinCodeChange, onMaxPlayersChange, onTimeMinutesChange, onStakeChange, onCreate, onCreateSinglePlayer, onJoin, disabled }) {
  const selectedChoice = stakeChoices.find((choice) => choice.value === stake)
  const stakeSummary = selectedChoice ? `${selectedChoice.label} per player` : 'Free play · no wallet debit'
  const lockedChoices = stakeChoices.filter((choice) => balance < choice.value).length
  const potLabel = selectedChoice ? `₹${(selectedChoice.value * maxPlayers).toLocaleString('en-IN')}` : null

  return (
    <section className="ludo-card">
      <div className="ludo-heading">
        <span className="ludo-kicker">BKR / Multiplayer arena</span>
        <h2>Play Ludo with your crew</h2>
        <p>Create a private room, share the code, and race your tokens home in real time.</p>
      </div>

      <div className="ludo-wallet-bar">
        <div className="ludo-wallet-copy">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <div>
            <span className="ludo-wallet-label">Wallet connected</span>
            <strong>{balanceLabel}</strong>
          </div>
        </div>
        <Link className="ludo-wallet-topup" to="/wallet/deposit">
          <span className="material-symbols-outlined">add_circle</span>
          Add funds
        </Link>
      </div>

      <div className="ludo-stake-picker">
        <div className="ludo-stake-head">
          <span className="ludo-stake-label">Bet per player</span>
          <span className="ludo-stake-selected">{stakeSummary}</span>
        </div>
        <div className="ludo-stake-chips" role="group" aria-label="Bet amount per player">
          <button className={`ludo-stake-chip${stake === 0 ? ' is-active' : ''}`} type="button" aria-pressed={stake === 0} onClick={() => onStakeChange(0)}>Free</button>
          {stakeChoices.map((choice) => {
            const affordable = balance >= choice.value
            return (
              <button
                className={`ludo-stake-chip${stake === choice.value ? ' is-active' : ''}${affordable ? '' : ' is-locked'}`}
                disabled={!affordable}
                key={choice.value}
                type="button"
                aria-pressed={stake === choice.value}
                title={affordable ? `Bet ${choice.label} per player` : `${choice.label} needs a bigger wallet balance`}
                onClick={() => onStakeChange(choice.value)}
              >
                {choice.label}
              </button>
            )
          })}
        </div>
        <p className="ludo-stake-note">
          {stake > 0
            ? `${selectedChoice?.label} is taken from your wallet only when the game starts and the winner takes the pot.`
            : 'Free play keeps your wallet untouched. Pick a bet amount to play for a cash pot.'}
          {lockedChoices > 0 && <span className="ludo-stake-hint"> Add funds to unlock {lockedChoices === 1 ? 'the locked bet amount' : `all ${lockedChoices} locked bet amounts`}.</span>}
        </p>
      </div>

      <div className="ludo-lobby-actions">
        <form className="ludo-action-card ludo-action-card--bot" onSubmit={(event) => { event.preventDefault(); onCreateSinglePlayer() }}>
          <h3>Play against the bot</h3>
          <p>Start instantly. The bot rolls automatically and moves a random valid token.</p>
          <div className="ludo-bot-preview"><span className="material-symbols-outlined">smart_toy</span><span>Solo match · automatic turns</span></div>
          <span className="ludo-card-stake"><span className="material-symbols-outlined">payments</span>{stakeSummary}</span>
          <button className="ludo-primary-btn" type="submit" disabled={disabled}><span className="material-symbols-outlined">sports_esports</span>Play solo</button>
        </form>
        <form className="ludo-action-card" onSubmit={(event) => { event.preventDefault(); onCreate() }}>
          <h3>Create a private room</h3>
          <p>You become the host and can start once the room is full.</p>
          <div className="ludo-room-options">
            <label className="ludo-form-field" htmlFor="ludo-player-count">Players
              <select id="ludo-player-count" value={maxPlayers} onChange={(event) => onMaxPlayersChange(Number(event.target.value))}>
                <option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option>
              </select>
            </label>
            <label className="ludo-form-field" htmlFor="ludo-time-limit">Time
              <select id="ludo-time-limit" value={timeMinutes} onChange={(event) => onTimeMinutesChange(Number(event.target.value))}>
                <option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option>
              </select>
            </label>
          </div>
          <p className="ludo-seat-note">{maxPlayers === 2 ? 'Opposite homes: you get green and your friend gets blue.' : 'Opponents are seated in opposite homes wherever possible.'}</p>
          <span className="ludo-card-stake"><span className="material-symbols-outlined">payments</span>{stakeSummary}{potLabel ? ` · pot ${potLabel}` : ' · no pot'}</span>
          <button className="ludo-primary-btn" type="submit" disabled={disabled}><span className="material-symbols-outlined">add_circle</span>Create room</button>
        </form>
        <form className="ludo-action-card" onSubmit={(event) => { event.preventDefault(); onJoin() }}>
          <h3>Join a room</h3>
          <p>Enter the six-character code shared by the room host.</p>
          <label className="ludo-form-field" htmlFor="ludo-room-code">Room code
            <input id="ludo-room-code" value={joinCode} onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())} placeholder="X7K9P2" maxLength={6} autoComplete="off" required />
          </label>
          <span className="ludo-card-stake"><span className="material-symbols-outlined">account_balance_wallet</span>The host sets the stake · your wallet is charged at kick-off</span>
          <button className="ludo-secondary-btn" type="submit" disabled={disabled}><span className="material-symbols-outlined">login</span>Join room</button>
        </form>
      </div>
    </section>
  )
}

export default LudoLobby
