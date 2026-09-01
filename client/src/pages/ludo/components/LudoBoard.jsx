const TRACK_COORDS = [
  [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11],
  [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11],
  [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7],
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3],
  [6, 2], [6, 1],
]

const HOME_LANES = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
}

const STARTS = { red: 0, green: 13, yellow: 26, blue: 39 }
const BASES = {
  red: [[1, 1], [1, 4], [4, 1], [4, 4]],
  green: [[1, 10], [1, 13], [4, 10], [4, 13]],
  yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
  blue: [[10, 1], [10, 4], [13, 1], [13, 4]],
}

const colors = ['red', 'green', 'yellow', 'blue']

function positionForToken(color, position, tokenIndex) {
  if (position === -1) return BASES[color][tokenIndex]
  if (position >= 0 && position <= 51) return TRACK_COORDS[(STARTS[color] + position) % TRACK_COORDS.length]
  if (position <= 56) return HOME_LANES[color][position - 52]
  return [7, 7]
}

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

function LudoBoard({ game, userId, validMoves, onMove }) {
  const tokens = game.players.flatMap((player) => player.tokens.map((position, tokenIndex) => ({ player, position, tokenIndex })))
  const currentPlayer = game.players[game.currentPlayer]

  return (
    <div className="ludo-board-wrap">
      <div className="ludo-board" aria-label="Ludo board">
        {Array.from({ length: 225 }, (_, index) => {
          const row = Math.floor(index / 15)
          const column = index % 15
          return <div className={cellClass(row, column)} key={`${row}-${column}`} />
        })}
        {tokens.map(({ player, position, tokenIndex }) => {
          const [row, column] = positionForToken(player.color, position, tokenIndex)
          const isMovable = player.userId === userId && currentPlayer?.userId === userId && validMoves.includes(tokenIndex)
          return <button className={`ludo-token token-${player.color}${isMovable ? ' is-movable' : ''}`} style={{ '--token-row': row, '--token-column': column }} disabled={!isMovable} onClick={() => onMove(tokenIndex)} key={`${player.userId}-${tokenIndex}`} aria-label={`${player.username} ${player.color} token ${tokenIndex + 1}`}><span>{tokenIndex + 1}</span></button>
        })}
        <div className="ludo-home-mark">HOME</div>
      </div>
    </div>
  )
}

export default LudoBoard
