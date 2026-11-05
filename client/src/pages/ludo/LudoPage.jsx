import './LudoPage.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../api/api'
import { formatCoins } from '../../utils/wallet'
import { useAuth } from '../../context/AuthContext'
import LudoBoard from './components/LudoBoard'
import LudoLobby from './components/LudoLobby'

const SOCKET_URL = API_BASE_URL
const LEGACY_ROOM_STORAGE_KEY = 'bkr_ludo_room'
const DICE_PIP_POSITIONS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

function playSound(context, effect, steps = 1) {
  if (!context || context.state !== 'running') return
  const patterns = {
    dice: [440, 660, 880], move: Array.from({ length: Math.min(steps, 6) }, (_, index) => 520 + (index % 3) * 110),
    home: [660, 880, 1100], capture: [330, 220, 440], win: [523, 659, 784, 1047],
  }
  const frequencies = patterns[effect] || []
  const start = context.currentTime
  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const volume = context.createGain()
    const at = start + index * (effect === 'move' ? 0.19 : 0.11)
    oscillator.type = effect === 'capture' ? 'triangle' : 'sine'
    oscillator.frequency.value = frequency
    volume.gain.setValueAtTime(0.0001, at)
    volume.gain.exponentialRampToValueAtTime(0.12, at + 0.015)
    volume.gain.exponentialRampToValueAtTime(0.0001, at + (effect === 'move' ? 0.13 : 0.19))
    oscillator.connect(volume).connect(context.destination)
    oscillator.start(at)
    oscillator.stop(at + 0.2)
  })
}

function DiceFace({ value, isRolling, disabled, onRoll, color }) {
  const pipPositions = DICE_PIP_POSITIONS[value] || []
  return (
    <button className={`ludo-dice${isRolling ? ' is-rolling' : ''}`} style={{ '--dice-color': `var(--ludo-${color || 'red'})` }} type="button" onClick={onRoll} disabled={disabled} aria-label={disabled ? (value ? `Dice showing ${value}` : 'Dice cannot be rolled now') : 'Roll dice'}>
      {value ? (
        <span className="ludo-dice-pips">
          {Array.from({ length: 9 }, (_, index) => <i className={pipPositions.includes(index + 1) ? 'is-pip' : ''} key={index} />)}
        </span>
      ) : <span className="ludo-dice-brand">BKR</span>}
    </button>
  )
}

function getRoomStorageKey(userId) {
  return `bkr_ludo_room_${String(userId || 'anonymous')}`
}

function formatCountdown(deadlineAt, now) {
  if (!deadlineAt) return '--:--'
  const seconds = Math.max(0, Math.ceil((Number(deadlineAt) - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function describeGameMode(game) {
  const mode = game?.gameMode || 'time'
  if (mode === 'moves') return `Move · ${game.moveLimit} moves`
  if (mode === 'full') return 'Full Play'
  return `Time · ${game?.timeMinutes || 10} minutes`
}

function LudoPage() {
  const { user, token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const socketRef = useRef(null)
  const audioContextRef = useRef(null)
  const [game, setGame] = useState(null)
  const roomStorageKey = getRoomStorageKey(user?.id)
  const [roomCode, setRoomCode] = useState(() => sessionStorage.getItem(roomStorageKey) || '')
  const [joinCode, setJoinCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [gameMode, setGameMode] = useState('time')
  const [moveLimit, setMoveLimit] = useState(20)
  const [timeMinutes, setTimeMinutes] = useState(10)
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [validMoves, setValidMoves] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [connection, setConnection] = useState('connecting')
  const [diceRolling, setDiceRolling] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('bkr_ludo_sound') !== 'off')
  const [movementAnimation, setMovementAnimation] = useState(null)
  const diceAnimationTimerRef = useRef(null)
  const lastGameStatusRef = useRef(null)

  const updateGame = useCallback((nextGame) => {
    if (nextGame?.status && nextGame.status !== lastGameStatusRef.current) {
      if (nextGame.status === 'playing') setNotice('Room full! Game started for all players.')
      if (nextGame.status === 'waiting') setNotice('Room ready. Share the code with your friends.')
      lastGameStatusRef.current = nextGame.status
    }
    setGame(nextGame)
    if (!nextGame?.diceValue || nextGame.status !== 'playing') setValidMoves([])
  }, [])

  useEffect(() => {
    const nextStatus = game?.status ?? null
    if (nextStatus === 'playing' && location.pathname !== '/ludo/play') navigate('/ludo/play', { replace: true })
    if (nextStatus === 'waiting' && location.pathname === '/ludo/play') navigate('/ludo', { replace: true })
  }, [game?.status, location.pathname, navigate])

  useEffect(() => {
    if (game?.status !== 'playing') return undefined
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [game?.status, game?.deadlineAt, game?.turnDeadlineAt, game?.turnTransitionUntil])

  useEffect(() => {
    if (!token) return undefined
    const socket = io(`${SOCKET_URL}/ludo`, { auth: { token } })
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
    socket.on('connect_error', (event) => { setConnection('error'); setError(event.message || 'Unable to connect to the Ludo server') })
    socket.on('ludoError', (payload) => setError(payload.message || 'Ludo action failed'))
    socket.on('gameState', updateGame)
    socket.on('playerJoined', updateGame)
    socket.on('playerLeft', updateGame)
    socket.on('playerDisconnected', (nextGame) => { updateGame(nextGame); setNotice('A player disconnected. They can reconnect shortly.') })
    socket.on('playerReconnected', (nextGame) => { updateGame(nextGame); setNotice('Player reconnected.') })
    socket.on('diceRolled', ({ playerId, validMoves: moves, turnForfeited }) => {
      if (soundEnabled) playSound(audioContextRef.current, 'dice')
      if (turnForfeited) setNotice(`${String(playerId) === String(user.id) ? 'Three sixes in a row — your turn is forfeited.' : 'Three sixes in a row — turn forfeited.'}`)
      if (String(playerId) === String(user.id)) setValidMoves(moves || [])
    })
    socket.on('tokenMoved', (movement) => {
      setMovementAnimation(movement)
      setValidMoves([])
      if (!soundEnabled) return
      if (movement.winner) playSound(audioContextRef.current, 'win')
      else if (movement.captured?.length) playSound(audioContextRef.current, 'capture')
      else if (movement.nextPosition === 56) playSound(audioContextRef.current, 'home')
      else playSound(audioContextRef.current, 'move', movement.steps)
    })
    socket.on('gameFinished', (nextGame) => { updateGame(nextGame); if (soundEnabled && nextGame.winReason === 'walkover') playSound(audioContextRef.current, 'win') })
    sessionStorage.removeItem(LEGACY_ROOM_STORAGE_KEY)
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      window.clearTimeout(diceAnimationTimerRef.current)
    }
  }, [roomStorageKey, soundEnabled, token, updateGame, user.id])

  function unlockAudio() {
    if (typeof window === 'undefined' || !window.AudioContext) return
    if (!audioContextRef.current) audioContextRef.current = new window.AudioContext()
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume().catch(() => {})
  }

  function toggleSound() {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('bkr_ludo_sound', next ? 'on' : 'off')
    if (next) { unlockAudio(); window.setTimeout(() => playSound(audioContextRef.current, 'move'), 0) }
  }

  function emitAction(event, payload, callback) {
    setError('')
    const socket = socketRef.current
    if (!socket?.connected) { setError('Connecting to the Ludo server...'); return }
    socket.emit(event, payload, (response) => {
      if (!response?.ok) setError(response?.message || 'Ludo action failed')
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
    emitAction('createRoom', { maxPlayers, gameMode, moveLimit, timeMinutes }, handleRoom)
  }

  function createSinglePlayerRoom() {
    sessionStorage.removeItem(roomStorageKey)
    setRoomCode('')
    emitAction('createRoom', { singlePlayer: true, timeMinutes }, handleRoom)
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

  function leaveRoom(destination = '/ludo') {
    emitAction('leaveRoom', { roomCode }, () => {
      setGame(null)
      setRoomCode('')
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

  function rollDice() {
    if (soundEnabled) unlockAudio()
    setDiceRolling(true)
    emitAction('rollDice', { roomCode }, (response) => updateGame(response.game))
    window.clearTimeout(diceAnimationTimerRef.current)
    diceAnimationTimerRef.current = window.setTimeout(() => setDiceRolling(false), 700)
  }

  function moveToken(tokenIndex) {
    emitAction('moveToken', { roomCode, tokenIndex }, (response) => updateGame(response.game))
  }

  const ownPlayer = useMemo(() => game?.players.find((player) => String(player.userId) === String(user.id)), [game, user.id])
  const currentPlayer = game?.players[game.currentPlayer]
  const isHost = game?.players[0]?.userId === ownPlayer?.userId
  const canStartGame = Boolean(isHost && game?.status === 'waiting' && game.players.length === game.maxPlayers)
  const isOwnTurn = currentPlayer?.userId === ownPlayer?.userId
  const turnStyle = { '--player-color': `var(--ludo-${currentPlayer?.color || 'red'})` }
  const balance = Number(user?.virtualCoins) || 0
  const balanceLabel = formatCoins(balance)
  // The dice is rendered inside the home yard of the player who is on turn.
  const inTurnTransition = Boolean(game?.turnTransitionUntil && Number(game.turnTransitionUntil) > clockNow)
  const turnSeconds = game?.turnDeadlineAt ? Math.max(0, Math.ceil((Number(game.turnDeadlineAt) - clockNow) / 1000)) : null
  const homeDice = <DiceFace value={game?.diceValue} color={currentPlayer?.color} isRolling={diceRolling} disabled={!isOwnTurn || Boolean(game?.diceValue) || diceRolling || inTurnTransition || turnSeconds === 0} onRoll={rollDice} />

  return (
    <main className={`ludo-page${game?.status === 'playing' ? ' ludo-page--playing' : ''}`}>
      <div className="ludo-shell">
        <header className="ludo-topbar">
          <div className="ludo-brand"><span className="ludo-brand-mark">BKR</span><div><h1>BKR Ludo</h1><p>Private multiplayer rooms</p></div></div>
          <div className="ludo-topbar-actions">
            <button className="ludo-sound-toggle" type="button" onClick={toggleSound} aria-pressed={soundEnabled} aria-label={soundEnabled ? 'Mute game sounds' : 'Enable game sounds'}><span className="material-symbols-outlined">{soundEnabled ? 'volume_up' : 'volume_off'}</span></button>
            <Link className="ludo-wallet-chip" to="/wallet" title="Open the BKR wallet">
              <span className="material-symbols-outlined">account_balance_wallet</span>
              <span className="ludo-wallet-chip-label">Wallet</span>
              <strong>{balanceLabel}</strong>
            </Link>
            <Link className="ludo-back" to="/dashboard" onClick={handleDashboardBack}><span className="material-symbols-outlined">arrow_back</span><span>Back to dashboard</span></Link>
          </div>
        </header>

        {error && <div className="ludo-error" role="alert">{error}</div>}
        {notice && <div className="ludo-notice" role="status">{notice}</div>}
        {connection !== 'connected' && !game && <div className="ludo-notice">{connection === 'connecting' ? 'Connecting to multiplayer...' : 'Multiplayer connection unavailable.'}</div>}

        {!game && <>
          <LudoLobby joinCode={joinCode} maxPlayers={maxPlayers} gameMode={gameMode} moveLimit={moveLimit} timeMinutes={timeMinutes} balanceLabel={balanceLabel} onJoinCodeChange={setJoinCode} onMaxPlayersChange={setMaxPlayers} onGameModeChange={setGameMode} onMoveLimitChange={setMoveLimit} onTimeMinutesChange={setTimeMinutes} onCreate={createRoom} onCreateSinglePlayer={createSinglePlayerRoom} onJoin={joinRoom} disabled={connection !== 'connected'} />
          <aside className="ludo-card ludo-side-card"><h3>How this room works</h3><ul className="ludo-rule-list"><li>Share the private six-character code.</li><li>Roll a 6 to bring a token out.</li><li>Land on opponents to send them home.</li><li>Safe cells protect tokens from capture.</li><li>Finish all four tokens to win.</li><li>The dice always sits in the home of the player whose turn it is.</li><li>A two-player match seats you both opposite: green faces blue.</li><li>Rooms are free to play and do not award prizes.</li></ul></aside>
        </>}

        {game?.status === 'waiting' && <section className="ludo-card ludo-room-panel ludo-room-panel--waiting">
          <div className="ludo-room-header">
            <div><span className="ludo-kicker">Private room</span><h2>Waiting for players</h2><div className="ludo-room-code">{roomCode}<button className="ludo-copy-btn" type="button" onClick={copyRoomCode} aria-label="Copy room code"><span className="material-symbols-outlined">content_copy</span></button></div></div>
          </div>
            <div className="ludo-stake-summary">
            <span className="ludo-stake-tag is-muted"><span className="material-symbols-outlined">token</span>Free play · no entry fee or prize</span>
          </div>
          <div className="ludo-mode-summary"><span className="material-symbols-outlined">tune</span>{describeGameMode(game)}</div>
          <div className="ludo-room-status">
            <span className={`ludo-status-pill ${game.players.length >= game.maxPlayers ? 'is-ready' : ''}`}>
              {game.players.length >= game.maxPlayers ? 'Room full — ready to start' : `${game.players.length}/${game.maxPlayers} joined`}
            </span>
          </div>
          <div className="ludo-room-players">
            {game.players.map((player) => <div className="ludo-player-row" key={player.userId}><i className="ludo-player-dot" style={{ '--player-color': `var(--ludo-${player.color})` }} /><strong>{player.username}</strong><small>{player.userId === game.players[0].userId ? 'Host' : 'Joined'}</small></div>)}
            {Array.from({ length: game.maxPlayers - game.players.length }, (_, index) => <div className="ludo-player-row" key={`empty-${index}`}><i className="ludo-player-dot" /><strong>Open seat</strong><small>Waiting</small></div>)}
          </div>
          <div className="ludo-room-footer"><p>{game.players.length}/{game.maxPlayers} players · {game.players.length < game.maxPlayers ? `Waiting for ${game.maxPlayers - game.players.length} more player${game.maxPlayers - game.players.length === 1 ? '' : 's'}` : 'Room full'} </p>{isHost && game.players.length === game.maxPlayers ? <button className="ludo-primary-btn" type="button" onClick={startGame} disabled={!canStartGame}>Start game</button> : <p>Waiting for the room to fill</p>}</div>
        </section>}

        {game?.status === 'playing' && <section className="ludo-layout ludo-live-transition">
          <div className="ludo-card ludo-game-layout ludo-live-board-shell">
            <div className="ludo-game-top">
              {/* <p>Turn {game.turnNumber} · {inTurnTransition ? 'Move complete' : isOwnTurn ? 'Your move' : `${currentPlayer?.username}'s move`}</p> */}
              <span className="ludo-stake-tag ludo-mode-indicator">
                <span className="material-symbols-outlined">{(game.gameMode || 'time') === 'full' ? 'all_inclusive' : (game.gameMode || 'time') === 'moves' ? 'swap_horiz' : 'schedule'}</span>
                {(game.gameMode || 'time') === 'time' ? `Time left ${formatCountdown(game.deadlineAt, clockNow)}` : (game.gameMode || 'time') === 'moves' ? `Moves left ${Math.max(0, (Number(game.moveLimit) || 0) - (Number(game.completedMoves) || 0))}` : 'Full Play'}
              </span>
              <div className="ludo-game-meta">
                <span className="ludo-stake-tag is-muted"><span className="material-symbols-outlined">token</span>Free play</span>
                <span className="ludo-turn-badge" style={turnStyle}><i />{currentPlayer?.color} turn</span>
                <span className={`ludo-turn-countdown${turnSeconds !== null && turnSeconds <= 5 ? ' is-urgent' : ''}`} aria-live="off">{inTurnTransition ? 'Next turn soon' : `Turn ${turnSeconds ?? 20}s`}</span>
              </div>
            </div>
            <div className="ludo-players-strip">{game.players.map((player) => <div className={`ludo-mini-player${player.userId === currentPlayer?.userId ? ' is-current' : ''}`} style={{ '--player-color': `var(--ludo-${player.color})` }} key={player.userId}><i />{player.username}<b>{Number(player.score) || 0} pts</b>{player.userId === ownPlayer?.userId && <b>YOU</b>}{!player.connected && <b>OFFLINE</b>}</div>)}</div>
            <LudoBoard game={game} userId={ownPlayer?.userId} validMoves={validMoves} onMove={moveToken} dice={homeDice} movement={movementAnimation} />
            <div className="ludo-dice-box ludo-dice-box--enhanced"><span className="material-symbols-outlined ludo-dice-hint-icon" aria-hidden="true">casino</span><div className="ludo-dice-copy"><strong>{isOwnTurn ? (game.diceValue ? (validMoves.length ? 'Choose a token' : 'No valid move') : `Tap the dice in your ${currentPlayer?.color} home`) : `Waiting for ${currentPlayer?.username}`}</strong><span>{game.diceValue ? `${validMoves.length} valid token${validMoves.length === 1 ? '' : 's'}` : (isOwnTurn ? `The dice sits in your ${currentPlayer?.color} home. A six brings a token out and grants another turn.` : `The dice sits in ${currentPlayer?.username}'s ${currentPlayer?.color} home.`)}</span></div></div>
          </div>
        </section>}

        {game?.status === 'finished' && <div className="ludo-winner"><div className="ludo-winner-card"><span className="material-symbols-outlined">emoji_events</span><h2>{game.draw ? 'Match tied' : `${game.winner?.username} wins!`}</h2><p>{game.winReason === 'walkover' ? 'Won by walkover — the other player left the game.' : game.winReason === 'time-limit' ? (game.draw ? 'Time expired with an exact tie on score and board progress.' : `Time expired. ${game.winner?.username} leads by movement score and board progress.`) : game.winReason === 'move-limit' ? (game.draw ? 'The move limit ended the match in a tie.' : `Move limit reached. ${game.winner?.username} leads by movement score and board progress.`) : `${game.winner?.color} completed all four tokens first.`}</p><button className="ludo-primary-btn" type="button" onClick={() => leaveRoom()}>Return to lobby</button></div></div>}
      </div>
    </main>
  )
}

export default LudoPage
