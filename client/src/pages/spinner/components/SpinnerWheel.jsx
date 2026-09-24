// The multiplayer wheel: one fixed pointer per joined player on the rim.
//
// The disc itself rotates to the rotation the server picked, so every winning
// slice ends up resting under the arrow of the player who spun it. Angles and
// colors come from spinnerGeometry.js, which mirrors the server engine.
import { WHEEL_SEGMENTS, pointerAngleForSeat, seatColor, wheelBackground } from './spinnerGeometry'

function initialsFor(username) {
  const text = String(username || '')
  if (!text) return '?'
  const parts = text.trim().split(/\s+/)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?'
}

function SpinnerWheel({ players = [], rotation = 0, spinning = false, spinDuration = 4200, activePlayerId = null, currentUserId = null, canSpin = false, status = 'waiting', spinHint = '', onSpin }) {
  const count = players.length
  const active = players.find((player) => player.userId === activePlayerId) || null
  const mine = players.find((player) => player.userId === currentUserId) || null
  const background = wheelBackground()
  const transition = spinning && spinDuration > 0 ? `transform ${spinDuration}ms cubic-bezier(.17,.67,.12,.99)` : 'none'

  return (
    <div className="wheel-wrap">
      <div className="wheel-glow" aria-hidden="true" />
      <div className={`spinner-wheel${spinning ? ' is-spinning' : ''}`} style={{ '--wheel-background': background, transform: `rotate(${rotation}deg)`, transition }} role="img" aria-label="Prize wheel">
        {WHEEL_SEGMENTS.map((segment, index) => {
          const angle = (index * 360) / WHEEL_SEGMENTS.length + 360 / WHEEL_SEGMENTS.length / 2
          return (
            <div className="wheel-label" key={`${segment.label}-${index}`} style={{ transform: `rotate(${angle}deg)` }}>
              <b>{segment.value > 0 ? `${segment.value}` : '—'}</b>
              <small>{segment.value > 0 ? 'pts' : 'zero'}</small>
            </div>
          )
        })}
      </div>

      <div className="wheel-pointers" aria-label={`${count} player pointer${count === 1 ? '' : 's'}`}>
        {players.map((player, index) => {
          const angle = player.pointerAngle ?? pointerAngleForSeat(index, count)
          const hex = seatColor(player.color)
          const isLive = player.userId === activePlayerId
          return (
            <div className={`wheel-pointer${isLive ? ' is-live' : ''}${player.userId === currentUserId ? ' is-mine' : ''}${player.connected === false ? ' is-offline' : ''}`} key={player.userId} style={{ '--pointer-angle': `${angle}deg`, transform: `rotate(${angle}deg)` }}>
              <span className="wheel-pointer-stem" style={{ background: hex }} />
              <span className="wheel-pointer-arrow" style={{ borderTopColor: hex }} />
              <span className="wheel-pointer-tag" style={{ borderColor: hex }}>{initialsFor(player.username)}</span>
            </div>
          )
        })}
      </div>

      <div className="wheel-center">
        <button
          className="spin-button"
          type="button"
          disabled={!canSpin}
          aria-label="Spin the wheel"
          onClick={() => canSpin && onSpin?.()}
        >
          {spinning ? 'Spinning…' : canSpin ? 'Spin now' : mine ? 'Hold on…' : 'Spin'}
        </button>
      </div>
      <div className="wheel-info">
        <strong>{active ? active.username : 'Waiting'}</strong>
        <small>{status === 'playing' ? spinHint || (active ? 'spinning the wheel' : '') : 'room not started'}</small>
      </div>
    </div>
  )
}

export default SpinnerWheel
