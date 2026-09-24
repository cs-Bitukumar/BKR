import './SpinnerPage.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../api/api'
import { formatCurrency, syncWalletBalance } from '../../utils/wallet'
import { useAuth } from '../../context/AuthContext'
import DashboardTopBar from '../dashboard/components/DashboardTopBar'
import DashboardBottomNav from '../dashboard/components/DashboardBottomNav'
import SpinnerLobby from './components/SpinnerLobby'
import SpinnerWheel from './components/SpinnerWheel'
import { scoreboardRows } from './components/spinnerGeometry'

const SOCKET_URL = API_BASE_URL
const LEGACY_ROOM_STORAGE_KEY = 'bkr_spinner_room'
// Wallet bet options offered in the lobby. The server validates the same list.
const STAKE_CHOICES = [1, 5, 10, 20, 100].map((value) => ({ value, label: `₹${value.toLocaleString('en-IN')}` }))
// Kept in sync with the .spinner-wheel transition in SpinnerPage.css.
const SPIN_DURATION_MS = 4200

function getRoomStorageKey(userId) {
  return `bkr_spinner_room_${String(userId || 'anonymous')}`
}

function formatStake(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 'Free play'
  return `₹${value.toLocaleString('en-IN')}`
}

function SpinnerPage() {
  const { user, token, refreshUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const socketRef = useRef(null)
  const roomStorageKey = getRoomStorageKey(user?.id)
  const [game, setGame] = useState(null)
  const [roomCode, setRoomCode] = useState(() => sessionStorage.getItem(roomStorageKey) || '')
  const [joinCode, setJoinCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [rounds, setRounds] = useState(5)
  const [stake, setStake] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [spinDuration, setSpinDuration] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [lastSpin, setLastSpin] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [connection, setConnection] = useState('connecting')
  const spinTimerRef = useRef(null)
  const lastGameStatusRef = useRef(null)
  const userRef = useRef(user)

  // The socket session must survive balance updates, so the newest user object
  // is mirrored in a ref instead of being added to the connection effect.
  useEffect(() => { userRef.current = user }, [user])
  const isSpinningRef = useRef(false)
  useEffect(() => { isSpinningRef.current = isSpinning }, [isSpinning])

  const updateGame = useCallback((nextGame) => {
    if (nextGame?.status && nextGame.status !== lastGameStatusRef.current) {
      if (nextGame.status === 'playing') setNotice('Room full! The wheel is live for every player.')
      if (nextGame.status === 'waiting') setNotice('Room ready. Share the code with your friends.')
      lastGameStatusRef.current = nextGame.status
    }
    // Shared state that did not come from a spin, such as a reconnect, snaps the
    // disc straight to the server rotation instead of animating through it.
    if (nextGame?.rotation != null && !isSpinningRef.current) setRotation(Number(nextGame.rotation) || 0)
    setGame(nextGame)
  }, [])

  // The disc travels to the rotation the server picked while every pointer stays
  // fixed on the rim, so the winning slice rests under the spinner's own arrow.
  const animateSpin = useCallback((spin) => {
    if (!spin) return
    setLastSpin(spin)
    setSpinDuration(SPIN_DURATION_MS)
    setRotation(Number(spin.rotation) || 0)
    setIsSpinning(true)
    window.clearTimeout(spinTimerRef.current)
    spinTimerRef.current = window.setTimeout(() => {
      setIsSpinning(false)
      setSpinDuration(0)
    }, SPIN_DURATION_MS)
  }, [])

  useEffect(() => {
    const nextStatus = game?.status ?? null
    if (nextStatus === 'playing' && location.pathname !== '/spinner/play') navigate('/spinner/play', { replace: true })
    if (nextStatus === 'waiting' && location.pathname === '/spinner/play') navigate('/spinner', { replace: true })
  }, [game?.status, location.pathname, navigate])

  useEffect(() => {
    if (!token) return undefined
    const socket = io(`${SOCKET_URL}/spinner`, { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnection('connected')
      const savedRoom = sessionStorage.getItem(roomStorageKey)
      if (savedRoom) {
        socket.emit('reconnectRoom', { roomCode: savedRoom }, (response) => {
          if (response?.ok) updateGame(response.game)
          else { sessionStorage.removeItem(roomStorageKey); setRoomCode('') }
        })
      }
    })
    socket.on('disconnect', () => { setConnection('disconnected'); setNotice('Connection lost. Trying to reconnect...') })
    socket.on('connect_error', (event) => { setConnection('error'); setError(event.message || 'Unable to connect to the Spinner server') })
    socket.on('spinnerError', (payload) => setError(payload.message || 'Spinner action failed'))
    socket.on('gameState', updateGame)
    socket.on('playerJoined', updateGame)
    socket.on('playerLeft', updateGame)
    socket.on('playerDisconnected', (nextGame) => { updateGame(nextGame); setNotice('A player disconnected. They can reconnect shortly.') })
    socket.on('playerReconnected', (nextGame) => { updateGame(nextGame); setNotice('Player reconnected.') })
    socket.on('gameStarted', updateGame)
    socket.on('wheelSpun', animateSpin)
    socket.on('gameFinished', updateGame)
    // The wallet balance is server authoritative: stakes, refunds and payouts
    // arrive here and are pushed into the shared auth session straight away.
    socket.on('walletUpdated', (payload) => {
      const nextBalance = Number(payload?.balance)
      if (!Number.isFinite(nextBalance)) return
      const currentUser = userRef.current
      if (!currentUser) return
      const previousBalance = Number(currentUser.balance) || 0
      syncWalletBalance(currentUser, nextBalance)
      refreshUser({ ...currentUser, balance: nextBalance })
      const change = nextBalance - previousBalance
      if (change > 0) setNotice(`${formatCurrency(change)} added to your wallet.`)
      else if (change < 0) setNotice(`${formatCurrency(Math.abs(change))} debited from your wallet.`)
    })
    sessionStorage.removeItem(LEGACY_ROOM_STORAGE_KEY)
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      window.clearTimeout(spinTimerRef.current)
    }
  }, [animateSpin, refreshUser, roomStorageKey, token, updateGame, user.id])

  function emitAction(event, payload, callback) {
    setError('')
    const socket = socketRef.current
    if (!socket?.connected) { setError('Connecting to the Spinner server...'); return }
    socket.emit(event, payload, (response) => {
      if (!response?.ok) setError(response?.message || 'Spinner action failed')
      else callback?.(response)
    })
  }

  function handleRoom(response) {
    setRoomCode(response.roomCode)
    sessionStorage.setItem(roomStorageKey, response.roomCode)
    updateGame(response.game)
    setNotice('Room ready. Share the code with your friends.')
  }

  function createRoom() {
    sessionStorage.removeItem(roomStorageKey)
    setRoomCode('')
    emitAction('createRoom', { maxPlayers, rounds, stake }, handleRoom)
  }

  function createSinglePlayerRoom() {
    sessionStorage.removeItem(roomStorageKey)
    setRoomCode('')
    emitAction('createRoom', { singlePlayer: true, maxPlayers, rounds, stake }, handleRoom)
  }

  function joinRoom() {
    const code = joinCode.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(code)) { setError('Enter a valid six-character room code'); return }
    sessionStorage.removeItem(roomStorageKey)
    setRoomCode('')
    emitAction('joinRoom', { roomCode: code }, (response) => {
      setJoinCode('')
      handleRoom(response)
    })
  }

  function startGame() { emitAction('startGame', { roomCode }) }

  function leaveRoom(destination = '/spinner') {
    emitAction('leaveRoom', { roomCode }, () => {
      setGame(null)
      setRoomCode('')
      setLastSpin(null)
      setRotation(0)
      sessionStorage.removeItem(roomStorageKey)
      setNotice('You left the room.')
      navigate(destination, { replace: true })
    })
  }

  function handleDashboardBack(event) {
    if (!game) return
    event.preventDefault()
    leaveRoom('/dashboard')
  }

  function copyRoomCode() {
    if (navigator.clipboard) navigator.clipboard.writeText(roomCode).then(() => setNotice('Room code copied.'))
  }

  function spinWheel() { emitAction('spinWheel', { roomCode }) }

  const ownPlayer = useMemo(() => game?.players?.find((player) => String(player.userId) === String(user.id)), [game, user.id])
  const currentPlayer = game?.players?.[game.currentPlayer]
  const isHost = Boolean(ownPlayer && game?.players?.[0]?.userId === ownPlayer.userId)
  const isOwnTurn = Boolean(ownPlayer && currentPlayer && String(currentPlayer.userId) === String(ownPlayer.userId))
  const canStartGame = Boolean(isHost && game?.status === 'waiting' && game.players.length === game.maxPlayers)
  const balance = Number(user?.balance) || 0
  const balanceLabel = formatCurrency(balance)
  // The scoreboard mirrors the wheel: seat order, pointer angle and colour.
  const scoreboard = useMemo(() => scoreboardRows(game?.players || []), [game?.players])
  const pointerCount = game?.players?.length || 0
  const ownTrail = [...(ownPlayer?.spins || [])].reverse()
  const spinsLeft = ownPlayer ? Math.max(0, (game?.rounds || 0) - ownPlayer.turnsPlayed) : 0
  const spinHint = game?.status === 'playing'
    ? (isOwnTurn
      ? `Your spin ${spinsLeft > 0 ? `· ${spinsLeft} left` : ''} — the wheel stops under your pointer.`
      : `Waiting for ${currentPlayer?.username || 'the next player'}`)
    : ''
  const seatPreview = (game?.players || []).map((player, index) => ({ ...player, seat: index + 1, pointerAngle: scoreboard[index]?.pointerAngle ?? 0, hex: scoreboard[index]?.hex || '#ffe0a5' }))

  return (
    <main className="dashboard-page spinner-page">
      <DashboardTopBar />
      <div className="spinner-shell">
        <div className="spinner-route-head">
          <div><span className="spinner-kicker">Dashboard / Multiplayer arena</span><h1>Lucky Spinner</h1><p>Private rooms · one pointer for every player who joins</p></div>
          <Link className="spinner-back" to="/dashboard" onClick={handleDashboardBack}><span className="material-symbols-outlined">arrow_back</span><span>Dashboard</span></Link>
        </div>

        {error && <div className="spinner-error" role="alert">{error}</div>}
        {notice && <div className="spinner-notice" role="status">{notice}</div>}
        {connection !== 'connected' && !game && <div className="spinner-notice">{connection === 'connecting' ? 'Connecting to multiplayer...' : 'Multiplayer connection unavailable.'}</div>}

        {!game && <>
          <SpinnerLobby joinCode={joinCode} maxPlayers={maxPlayers} rounds={rounds} stake={stake} stakeChoices={STAKE_CHOICES} balance={balance} balanceLabel={balanceLabel} onJoinCodeChange={setJoinCode} onMaxPlayersChange={setMaxPlayers} onRoundsChange={setRounds} onStakeChange={setStake} onCreate={createRoom} onCreateSinglePlayer={createSinglePlayerRoom} onJoin={joinRoom} disabled={connection !== 'connected'} />
          <aside className="spinner-card spinner-side-card">
            <h3>How this room works</h3>
            <ul className="spinner-rule-list">
              <li>Share the private six-character code with your crew.</li>
              <li>Every player gets their own pointer on the wheel rim.</li>
              <li>Two players face each other, three split the rim into thirds and four use the quarters.</li>
              <li>Only the player on turn can spin the wheel.</li>
              <li>Your slice always stops under your own pointer.</li>
              <li>Everyone takes the same number of turns, then the highest score wins.</li>
              <li>Stakes come from your BKR wallet and the winner takes the whole pot.</li>
              <li>Solo rooms fill the open seats with BKR Bot, which spins automatically.</li>
              <li>If everyone else leaves, the last player wins by walkover.</li>
            </ul>
          </aside>
        </>}
{game?.status === 'waiting' && <section className="spinner-card spinner-room-panel">
          <div className="spinner-room-header">
            <div>
              <span className="spinner-kicker">Private room</span>
              <h2>Waiting for players</h2>
              <div className="spinner-room-code">{roomCode}<button className="spinner-copy-btn" type="button" onClick={copyRoomCode} aria-label="Copy room code"><span className="material-symbols-outlined">content_copy</span></button></div>
            </div>
            <div className="spinner-room-meta">
              <span className={`spinner-stake-tag${game.stake > 0 ? ' is-live' : ''}`}><span className="material-symbols-outlined">payments</span>{game.stake > 0 ? `${formatStake(game.stake)} per player` : 'Free play'}</span>
              {game.pot > 0 && <span className="spinner-stake-tag"><span className="material-symbols-outlined">emoji_events</span>Pot {formatStake(game.pot)}</span>}
              <span className="spinner-stake-tag is-muted"><span className="material-symbols-outlined">casino</span>{game.rounds} spins each</span>
            </div>
          </div>
          <p className="spinner-room-note">
            {pointerCount === 1
              ? 'Another player is yet to join.'
              : `${pointerCount} players joined, so the wheel now carries ${pointerCount} pointers — one arrow per player.`}
          </p>
          <div className="spinner-seat-list">
            {seatPreview.map((player) => (
              <div className={`spinner-seat-row${player.userId === currentPlayer?.userId ? ' is-current' : ''}`} key={player.userId} style={{ '--seat-color': player.hex }}>
                <i className="spinner-seat-dot" />
                <strong>{player.username}{player.userId === ownPlayer?.userId && <b>YOU</b>}{player.isBot && <b>BOT</b>}</strong>
                <small>Seat {player.seat} · pointer {Math.round(player.pointerAngle)}°</small>
                <span className="material-symbols-outlined spinner-seat-arrow" aria-hidden="true">arrow_upward</span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, game.maxPlayers - game.players.length) }, (_, index) => (
              <div className="spinner-seat-row is-empty" key={`open-${index}`}><i className="spinner-seat-dot" /><strong>Open seat</strong><small>Pointer appears when a player joins</small></div>
            ))}
          </div>
          <div className="spinner-room-footer">
            <p>{game.players.length}/{game.maxPlayers} players · {game.players.length < game.maxPlayers ? `Waiting for ${game.maxPlayers - game.players.length} more player${game.maxPlayers - game.players.length === 1 ? '' : 's'}` : 'Room full'}</p>
            {isHost && game.players.length === game.maxPlayers
              ? <button className="spinner-primary-btn" type="button" onClick={startGame} disabled={!canStartGame}><span className="material-symbols-outlined">casino</span>Start spinning</button>
              : <p>Waiting for the room to fill</p>}
            <button className="spinner-secondary-btn" type="button" onClick={() => leaveRoom()}><span className="material-symbols-outlined">logout</span>Leave room</button>
          </div>
        </section>}
{game?.status === 'playing' && <section className="spinner-layout spinner-live">
          <div className="spinner-card spinner-stage">
            <div className="spinner-heading">
              <div>
                <span className="spinner-kicker">{game.stake > 0 ? `${formatStake(game.stake)} stake room` : 'Free play room'}</span>
                <h2>{isOwnTurn ? 'Your turn to spin' : `${currentPlayer?.username} is spinning`}</h2>
                <p>Turn {game.turnNumber} · {pointerCount} pointer{pointerCount === 1 ? '' : 's'} on the wheel{game.pot > 0 ? ` · pot ${formatStake(game.pot)}` : ''}</p>
              </div>
              <div className="spinner-score"><span>Your score</span><strong>{ownPlayer?.score || 0}</strong><small>{spinsLeft} spin{spinsLeft === 1 ? '' : 's'} left</small></div>
            </div>
            <div className="spinner-stats" aria-label="Spinner room stats">
              <span><b>{game.totalSpins}</b> total spins</span>
              <span><b>{ownPlayer?.turnsPlayed || 0}/{game.rounds}</b> your turns</span>
              <span><b>{scoreboard.reduce((best, player) => Math.max(best, player.best), 0)}</b> best single spin</span>
              <span><b>{scoreboard.reduce((top, player) => Math.max(top, player.score), 0)}</b> top score</span>
            </div>
            <SpinnerWheel
              players={game.players}
              rotation={rotation}
              spinning={isSpinning}
              spinDuration={spinDuration}
              activePlayerId={currentPlayer?.userId}
              currentUserId={ownPlayer?.userId}
              canSpin={Boolean(isOwnTurn && !isSpinning)}
              status={game.status}
              spinHint={spinHint}
              onSpin={spinWheel}
            />
            {lastSpin && <div className="spinner-result" role="status"><span className="result-spark">✦</span><p><strong>{lastSpin.username}</strong> landed on <strong>{lastSpin.label}</strong>{lastSpin.value > 0 ? ` and earned ${lastSpin.value} points.` : ' — no points this time.'}</p></div>}
          </div>

          <aside className="spinner-card spinner-scoreboard">
            <div className="history-heading"><div><span className="spinner-kicker">Live standings</span><h2>Scoreboard</h2></div><span className="spinner-scoreboard-count">{pointerCount} pointer{pointerCount === 1 ? '' : 's'}</span></div>
            <div className="turn-list">
              {scoreboard.map((player) => (
                <div className={`turn-row spinner-score-row${player.userId === currentPlayer?.userId ? ' is-current' : ''}${player.connected === false ? ' is-offline' : ''}`} key={player.userId}>
                  <span className="turn-number">{player.seat + 1}</span>
                  <span className="turn-color" style={{ background: player.hex }} />
                  <strong>{player.username}{player.userId === ownPlayer?.userId && <b className="spinner-you">YOU</b>}</strong>
                  <span className="spinner-score-value">{player.score} pts</span>
                  <small className="spinner-score-meta">pointer {Math.round(player.pointerAngle)}° · {player.turnsPlayed}/{game.rounds} turns · best {player.best}</small>
                </div>
              ))}
            </div>
            <div className="spinner-rules">
              <h3>Your trail</h3>
              {ownTrail.length
                ? <div className="turn-list">{ownTrail.map((spin, index) => <div className="turn-row" key={`${spin.index}-${index}`}><span className="turn-number">{ownTrail.length - index}</span><span className="turn-color" style={{ background: spin.color }} /><strong>{spin.label}</strong><span>{spin.value > 0 ? `+${spin.value}` : '—'}</span></div>)}</div>
                : <div className="empty-history"><span className="material-symbols-outlined">history</span><p>Your spins will appear here.</p><small>The wheel is waiting for your turn.</small></div>}
              <p>Every slice stops under the pointer of the player who spun it, so nobody can confuse whose arrow is live.</p>
            </div>
            <button className="spinner-secondary-btn" type="button" onClick={() => leaveRoom()}><span className="material-symbols-outlined">logout</span>Leave room</button>
          </aside>
        </section>}
      </div>
      <DashboardBottomNav activeLabel="Spin" />
    </main>
  )
}

export default SpinnerPage
