import './LudoPage.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import LudoBoard from './components/LudoBoard'
import LudoLobby from './components/LudoLobby'

const SOCKET_URL = API_BASE_URL
const LEGACY_ROOM_STORAGE_KEY = 'bkr_ludo_room'

function getRoomStorageKey(userId) {
  return `bkr_ludo_room_${String(userId || 'anonymous')}`
}

function LudoPage() {
  const { user, token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const socketRef = useRef(null)
  const [game, setGame] = useState(null)
  const roomStorageKey = getRoomStorageKey(user?.id)
  const [roomCode, setRoomCode] = useState(() => sessionStorage.getItem(roomStorageKey) || '')
  const [joinCode, setJoinCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [timeMinutes, setTimeMinutes] = useState(10)
  const [validMoves, setValidMoves] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [connection, setConnection] = useState('connecting')
  const [diceRolling, setDiceRolling] = useState(false)
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
    socket.on('diceRolled', ({ playerId, validMoves: moves }) => {
      if (String(playerId) === String(user.id)) setValidMoves(moves || [])
    })
    socket.on('tokenMoved', () => setValidMoves([]))
    socket.on('gameFinished', updateGame)
    sessionStorage.removeItem(LEGACY_ROOM_STORAGE_KEY)
    return () => { socket.removeAllListeners(); socket.disconnect(); socketRef.current = null }
  }, [roomStorageKey, token, updateGame, user.id])

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
    emitAction('createRoom', { maxPlayers, timeMinutes }, handleRoom)
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

  function leaveRoom() {
    emitAction('leaveRoom', { roomCode }, () => {
      setGame(null)
      setRoomCode('')
      sessionStorage.removeItem(roomStorageKey)
      setNotice('You left the room.')
      navigate('/ludo', { replace: true })
    })
  }

  function copyRoomCode() {
    if (navigator.clipboard) navigator.clipboard.writeText(roomCode).then(() => setNotice('Room code copied.'))
  }

  function rollDice() {
    setDiceRolling(true)
    emitAction('rollDice', { roomCode }, (response) => { setDiceRolling(false); updateGame(response.game) })
    window.setTimeout(() => setDiceRolling(false), 1200)
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

  return (
    <main className="ludo-page">
      <div className="ludo-shell">
        <header className="ludo-topbar">
          <div className="ludo-brand"><span className="ludo-brand-mark">BKR</span><div><h1>BKR Ludo</h1><p>Private multiplayer rooms</p></div></div>
          <Link className="ludo-back" to="/dashboard"><span className="material-symbols-outlined">arrow_back</span><span>Back to dashboard</span></Link>
        </header>

        {error && <div className="ludo-error" role="alert">{error}</div>}
        {notice && <div className="ludo-notice" role="status">{notice}</div>}
        {connection !== 'connected' && !game && <div className="ludo-notice">{connection === 'connecting' ? 'Connecting to multiplayer...' : 'Multiplayer connection unavailable.'}</div>}

        {!game && <>
          <LudoLobby joinCode={joinCode} maxPlayers={maxPlayers} timeMinutes={timeMinutes} onJoinCodeChange={setJoinCode} onMaxPlayersChange={setMaxPlayers} onTimeMinutesChange={setTimeMinutes} onCreate={createRoom} onCreateSinglePlayer={createSinglePlayerRoom} onJoin={joinRoom} disabled={connection !== 'connected'} />
          <aside className="ludo-card ludo-side-card"><h3>How this room works</h3><ul className="ludo-rule-list"><li>Share the private six-character code.</li><li>Roll a 6 to bring a token out.</li><li>Land on opponents to send them home.</li><li>Safe cells protect tokens from capture.</li><li>Finish all four tokens to win.</li></ul></aside>
        </>}

        {game?.status === 'waiting' && <section className="ludo-card ludo-room-panel ludo-room-panel--waiting">
          <div className="ludo-room-header">
            <div><span className="ludo-kicker">Private room</span><h2>Waiting for players</h2><div className="ludo-room-code">{roomCode}<button className="ludo-copy-btn" type="button" onClick={copyRoomCode} aria-label="Copy room code"><span className="material-symbols-outlined">content_copy</span></button></div></div>
            <button className="ludo-secondary-btn" type="button" onClick={leaveRoom}>Leave</button>
          </div>
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
            <div className="ludo-transition-banner">
              <span className="ludo-transition-badge">Room full</span>
              <strong>Game live for all players</strong>
            </div>
            <div className="ludo-game-top"><p>Turn {game.turnNumber} · {isOwnTurn ? 'Your move' : `${currentPlayer?.username}'s move`}</p><span className="ludo-turn-badge" style={turnStyle}><i />{currentPlayer?.color} turn</span></div>
            <div className="ludo-players-strip">{game.players.map((player) => <div className={`ludo-mini-player${player.userId === currentPlayer?.userId ? ' is-current' : ''}`} style={{ '--player-color': `var(--ludo-${player.color})` }} key={player.userId}><i />{player.username}{player.userId === ownPlayer?.userId && <b>YOU</b>}{!player.connected && <b>OFFLINE</b>}</div>)}</div>
            <LudoBoard game={game} userId={ownPlayer?.userId} validMoves={validMoves} onMove={moveToken} />
            <div className="ludo-controls"><div className="ludo-dice-box"><div className={`ludo-dice${diceRolling ? ' is-rolling' : ''}`}>{game.diceValue || '—'}</div><div className="ludo-dice-copy"><strong>{isOwnTurn ? (game.diceValue ? (validMoves.length ? 'Choose a token' : 'No valid move') : 'Roll the dice') : `Waiting for ${currentPlayer?.username}`}</strong><span>{game.diceValue ? `${validMoves.length} valid token${validMoves.length === 1 ? '' : 's'}` : 'A six brings a token out and grants another turn.'}</span></div></div><div className="ludo-game-actions"><button className="ludo-primary-btn" type="button" onClick={rollDice} disabled={!isOwnTurn || Boolean(game.diceValue) || diceRolling}>Roll dice</button><button className="ludo-secondary-btn" type="button" onClick={leaveRoom}>Leave</button></div></div>
          </div>
        </section>}

        {game?.status === 'finished' && <div className="ludo-winner"><div className="ludo-winner-card"><span className="material-symbols-outlined">emoji_events</span><h2>{game.winner?.username} wins!</h2><p>{game.winner?.color} completed all four tokens first.</p><button className="ludo-primary-btn" type="button" onClick={leaveRoom}>Return to lobby</button></div></div>}
      </div>
    </main>
  )
}

export default LudoPage
