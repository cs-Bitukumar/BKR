function LudoLobby({ joinCode, maxPlayers, onJoinCodeChange, onMaxPlayersChange, onCreate, onJoin, disabled }) {
  return (
    <section className="ludo-card">
      <div className="ludo-heading">
        <span className="ludo-kicker">BKR / Multiplayer arena</span>
        <h2>Play Ludo with your crew</h2>
        <p>Create a private room, share the code, and race your tokens home in real time.</p>
      </div>
      <div className="ludo-lobby-actions">
        <form className="ludo-action-card" onSubmit={(event) => { event.preventDefault(); onCreate() }}>
          <h3>Create a private room</h3>
          <p>You become the host and can start once at least one friend joins.</p>
          <label className="ludo-form-field" htmlFor="ludo-player-count">Players
            <select id="ludo-player-count" value={maxPlayers} onChange={(event) => onMaxPlayersChange(Number(event.target.value))}>
              <option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option>
            </select>
          </label>
          <button className="ludo-primary-btn" type="submit" disabled={disabled}><span className="material-symbols-outlined">add_circle</span>Create room</button>
        </form>
        <form className="ludo-action-card" onSubmit={(event) => { event.preventDefault(); onJoin() }}>
          <h3>Join a room</h3>
          <p>Enter the six-character code shared by the room host.</p>
          <label className="ludo-form-field" htmlFor="ludo-room-code">Room code
            <input id="ludo-room-code" value={joinCode} onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())} placeholder="X7K9P2" maxLength={6} autoComplete="off" required />
          </label>
          <button className="ludo-secondary-btn" type="submit" disabled={disabled}><span className="material-symbols-outlined">login</span>Join room</button>
        </form>
      </div>
    </section>
  )
}

export default LudoLobby
