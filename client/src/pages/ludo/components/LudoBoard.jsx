import { useEffect, useState } from 'react'
import { HOME_LANES, HOME_SCORE_ANCHORS, STARTS, TRACK_COORDS, positionForToken } from './boardGeometry'

const colors = ['red', 'green', 'yellow', 'blue']
export const TOKEN_STEP_DURATION_MS = 300

function cellClass(row, column) {
  const classes = ['ludo-cell']
  if (row < 6 && column < 6) classes.push('is-red-base')
  if (row < 6 && column > 8) classes.push('is-green-base')
  if (row > 8 && column > 8) classes.push('is-yellow-base')
  if (row > 8 && column < 6) classes.push('is-blue-base')
  const trackIndex = TRACK_COORDS.findIndex(([trackRow, trackColumn]) => trackRow === row && trackColumn === column)
  if (trackIndex >= 0) classes.push('is-track')
  colors.forEach((color) => {
    if (HOME_LANES[color].some(([laneRow, laneColumn]) => laneRow === row && laneColumn === column)) classes.push(`is-${color}-lane`)
    if (STARTS[color] === trackIndex) classes.push(`is-${color}-start`)
  })
  if (row >= 6 && row <= 8 && column >= 6 && column <= 8) classes.push('is-home-center')
  if (trackIndex >= 0 && [0, 8, 13, 21, 26, 34, 39, 47].includes(trackIndex)) classes.push('is-safe')
  return classes.join(' ')
}

function LudoBoard({ game, userId, validMoves, onMove, dice, movement }) {
  const [animatedPosition, setAnimatedPosition] = useState(null)
  useEffect(() => {
    if (!movement?.movementId) return undefined
    let step = 0
    const totalSteps = Math.max(1, movement.steps || 1)
    let timer
    let finishTimer
    const startTimer = window.setTimeout(() => {
      setAnimatedPosition({ playerId: movement.playerId, tokenIndex: movement.tokenIndex, position: movement.oldPosition })
      timer = window.setInterval(() => {
        step += 1
        setAnimatedPosition({ playerId: movement.playerId, tokenIndex: movement.tokenIndex, position: movement.oldPosition === -1 ? movement.nextPosition : Math.min(movement.oldPosition + step, movement.nextPosition) })
        if (step >= totalSteps) {
          window.clearInterval(timer)
          finishTimer = window.setTimeout(() => setAnimatedPosition(null), TOKEN_STEP_DURATION_MS)
        }
      }, TOKEN_STEP_DURATION_MS)
    }, 0)
    return () => { window.clearTimeout(startTimer); window.clearInterval(timer); window.clearTimeout(finishTimer) }
  }, [movement])
  const tokens = game.players.flatMap((player) => player.tokens.map((position, tokenIndex) => ({ player, position, tokenIndex })))
  const currentPlayer = game.players[game.currentPlayer]

  return (
    <div className="ludo-board-wrap">
      <div className="ludo-board" aria-label="Ludo board">
        {Array.from({ length: 225 }, (_, index) => {
          const row = Math.floor(index / 15)
          const column = index % 15
          const classes = cellClass(row, column)
          const isSafe = classes.includes('is-safe')
          return <div className={classes} key={`${row}-${column}`}>{isSafe && <span className="ludo-safe-star" aria-hidden="true">★</span>}</div>
        })}
        <div className="ludo-base ludo-base--red" aria-hidden="true"><span>RED</span></div>
        <div className="ludo-base ludo-base--green" aria-hidden="true"><span>GREEN</span></div>
        <div className="ludo-base ludo-base--yellow" aria-hidden="true"><span>YELLOW</span></div>
        <div className="ludo-base ludo-base--blue" aria-hidden="true"><span>BLUE</span></div>
        {game.players.map((player) => (
          <div
            className={`ludo-home-score ludo-home-score--${player.color}`}
            style={HOME_SCORE_ANCHORS[player.color]}
            key={`score-${player.userId}`}
            aria-label={`${player.color} score ${Number(player.score) || 0}`}
          >
            <span>SCORE</span><strong>{Number(player.score) || 0}</strong>
          </div>
        ))}
        {/* The roll dice lives inside the home yard of whichever colour is on
            turn, so every player looks at the right corner of the board. */}
        {currentPlayer && <div className={`ludo-yard-dice ludo-yard-dice--${currentPlayer.color}`}>{dice}</div>}
        {tokens.map(({ player, position, tokenIndex }) => {
          const isAnimating = animatedPosition?.playerId === player.userId && animatedPosition.tokenIndex === tokenIndex
          const visiblePosition = isAnimating ? animatedPosition.position : position
          const [row, column] = positionForToken(player.color, visiblePosition, tokenIndex)
          const isMovable = player.userId === userId && currentPlayer?.userId === userId && validMoves.includes(tokenIndex)
          return <button className={`ludo-token token-${player.color}${isMovable ? ' is-movable' : ''}${isAnimating ? ' is-stepping' : ''}`} style={{ '--token-row': row, '--token-column': column }} disabled={!isMovable || isAnimating} onClick={() => onMove(tokenIndex)} key={`${player.userId}-${tokenIndex}`} aria-label={`${player.username} ${player.color} token ${tokenIndex + 1}`}><span>{tokenIndex + 1}</span></button>
        })}
        <div className="ludo-home-mark"><span>HOME</span></div>
      </div>
    </div>
  )
}

export default LudoBoard
