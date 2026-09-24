export const TRACK_COORDS = [
  // Clockwise track; each colour starts 13 cells after the previous one.
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6],
  [2, 6], [1, 6], [0, 6], [0, 7], [0, 8], [1, 8], [2, 8], [3, 8],
  [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6],
  [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2],
  [8, 1], [8, 0], [7, 0], [6, 0],
]

export const HOME_LANES = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
}

export const STARTS = { red: 0, green: 13, yellow: 26, blue: 39 }
const BASES = {
  red: [[1, 1], [1, 4], [4, 1], [4, 4]],
  green: [[1, 10], [1, 13], [4, 10], [4, 13]],
  yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
  blue: [[10, 1], [10, 4], [13, 1], [13, 4]],
}

export function positionForToken(color, position, tokenIndex) {
  if (position === -1) return BASES[color][tokenIndex]
  // Turn into the lane after local track position 50 (green: [0, 7]).
  // Positions 51–56 use all six lane cells before final home at 57.
  if (position >= 0 && position <= 50) return TRACK_COORDS[(STARTS[color] + position) % TRACK_COORDS.length]
  if (position <= 56) return HOME_LANES[color][position - 51]
  return [7, 7]
}
