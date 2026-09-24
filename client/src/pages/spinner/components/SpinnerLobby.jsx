import { Link } from 'react-router-dom'

const MAX_PLAYER_CHOICES = [2, 3, 4]
const ROUND_CHOICES = [3, 5, 10]

/**
 * Spinner lobby: the same flow as the Ludo lobby - play a house bot solo, open a
 * private code room, or join a room code - with the wheel's own stake and round
 * options.
 */
function SpinnerLobby({ joinCode, maxPlayers, rounds, stake, stakeChoices, balance, balanceLabel, onJoinCodeChange, onMaxPlayersChange, onRoundsChange, onStakeChange, onCreate, onCreateSinglePlayer, onJoin, disabled }) {
  const selectedChoice = stakeChoices.find((choice) => choice.value === stake)
  const stakeSummary = selectedChoice ? `${selectedChoice.label} per player` : 'Free play - no wallet debit'
  const lockedChoices = stakeChoices.filter((choice) => balance < choice.value).length
  const potLabel = selectedChoice ? `${(selectedChoice.value * maxPlayers).toLocaleString('en-IN')}` : null

  return (
    <section className="spinner-card spinner-lobby">
      <div className="spinner-heading spinner-lobby-heading">
        <div>
          <span className="spinner-kicker">BKR / Multiplayer arena</span>
          <h2>Spin with your crew</h2>
          <p>Create a private room, share the code, and let every joined player take the wheel.</p>
        </div>
      </div>

      <div className="spinner-wallet-bar">
        <div className="spinner-wallet-copy">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <div>
            <span className="spinner-wallet-label">Wallet connected</span>
            <strong>{balanceLabel}</strong>
          </div>
        </div>
        <Link className="spinner-wallet-topup" to="/wallet/deposit">
          <span className="material-symbols-outlined">add_circle</span>
          Add funds
        </Link>
      </div>

      <div className="spinner-stake-picker">
        <div className="spinner-stake-head">
          <span className="spinner-stake-label">Bet per player</span>
          <span className="spinner-stake-selected">{stakeSummary}</span>
        </div>
        <div className="spinner-stake-chips" role="group" aria-label="Bet amount per player">
          <button className={`spinner-stake-chip${stake === 0 ? ' is-active' : ''}`} type="button" aria-pressed={stake === 0} onClick={() => onStakeChange(0)}>Free</button>
          {stakeChoices.map((choice) => {
            const affordable = balance >= choice.value
            return (
              <button
                className={`spinner-stake-chip${stake === choice.value ? ' is-active' : ''}${affordable ? '' : ' is-locked'}`}
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
        <p className="spinner-stake-note">
          {stake > 0
            ? `${selectedChoice?.label} is debited only when the game starts, and the highest score takes the pot.`
            : 'Free play keeps your wallet untouched. Pick a bet amount to spin for a cash pot.'}
          {lockedChoices > 0 && <span className="spinner-stake-hint"> Add funds to unlock {lockedChoices === 1 ? 'the locked bet amount' : `all ${lockedChoices} locked bet amounts`}.</span>}
        </p>
      </div>

      <div className="spinner-lobby-actions">
        <form className="spinner-action-card spinner-action-card--bot" onSubmit={(event) => { event.preventDefault(); onCreateSinglePlayer() }}>
          <h3>Play against the bot</h3>
          <p>Start instantly. Every open seat is filled by BKR Bot, which spins the wheel on its own.</p>
          <div className="spinner-bot-preview"><span className="material-symbols-outlined">smart_toy</span><span>Solo match - automatic spins</span></div>
          <span className="spinner-card-stake"><span className="material-symbols-outlined">payments</span>{stakeSummary}</span>
          <button className="spinner-primary-btn" type="submit" disabled={disabled}><span className="material-symbols-outlined">casino</span>Play solo</button>
        </form>

        <form className="spinner-action-card" onSubmit={(event) => { event.preventDefault(); onCreate() }}>
          <h3>Create a private room</h3>
          <p>You become the host and the wheel starts once every seat is taken.</p>
          <div className="spinner-room-options">
            <label className="spinner-form-field" htmlFor="spinner-player-count">Players
              <select id="spinner-player-count" value={maxPlayers} onChange={(event) => onMaxPlayersChange(Number(event.target.value))}>
                {MAX_PLAYER_CHOICES.map((choice) => <option key={choice} value={choice}>{choice} players</option>)}
              </select>
            </label>
            <label className="spinner-form-field" htmlFor="spinner-round-count">Turns each
              <select id="spinner-round-count" value={rounds} onChange={(event) => onRoundsChange(Number(event.target.value))}>
                {ROUND_CHOICES.map((choice) => <option key={choice} value={choice}>{choice} spins each</option>)}
              </select>
            </label>
          </div>
          <p className="spinner-seat-note">{maxPlayers === 2 ? 'Two pointers face each other, one per player.' : `Each player gets one pointer, ${360 / maxPlayers} degrees apart.`}</p>
          <span className="spinner-card-stake"><span className="material-symbols-outlined">payments</span>{stakeSummary}{potLabel ? ` - pot ${potLabel}` : ' - no pot'}</span>
          <button className="spinner-primary-btn" type="submit" disabled={disabled}><span className="material-symbols-outlined">add_circle</span>Create room</button>
        </form>

        <form className="spinner-action-card" onSubmit={(event) => { event.preventDefault(); onJoin() }}>
          <h3>Join a room</h3>
          <p>Enter the six-character code shared by the room host.</p>
          <label className="spinner-form-field" htmlFor="spinner-room-code">Room code
            <input id="spinner-room-code" value={joinCode} onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())} placeholder="X7K9P2" maxLength={6} autoComplete="off" required />
          </label>
          <span className="spinner-card-stake"><span className="material-symbols-outlined">account_balance_wallet</span>The host sets the stake, your wallet is charged at kick-off</span>
          <button className="spinner-secondary-btn" type="submit" disabled={disabled}><span className="material-symbols-outlined">login</span>Join room</button>
        </form>
      </div>
    </section>
  )
}

export default SpinnerLobby