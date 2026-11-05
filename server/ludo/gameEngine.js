export const LUDO_COLORS = ['red', 'green', 'yellow', 'blue'];
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOKENS_PER_PLAYER = 4;
export const FINAL_POSITION = 56;
export const BOT_USER_ID = 'ludo-bot';
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const START_CELLS = { red: 0, green: 13, yellow: 26, blue: 39 };
// Two-player and three-player rooms seat the first two players in diagonal
// yards (green/blue or red/yellow) so they always sit opposite each other.
export const TWO_PLAYER_COLORS = ['green', 'blue'];
export const THREE_PLAYER_COLORS = ['red', 'yellow', 'green'];
const TRACK_LENGTH = 52;
export const DEFAULT_STAKE = 0;
export const LUDO_TIME_OPTIONS = [5, 10, 15, 30];
export const LUDO_MOVE_LIMIT_OPTIONS = [20, 25, 30];
export const LUDO_GAME_MODES = ['time', 'moves', 'full'];

const PLAYER_HOME_PATHS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createTokens() {
  return Array.from({ length: TOKENS_PER_PLAYER }, () => -1);
}

function createTokenScores() {
  return Array.from({ length: TOKENS_PER_PLAYER }, () => 0);
}

// Stake parameters from old clients are ignored; rooms are always free.
export function normalizeStake(value) {
  return 0;
}

export function calculatePot(game) {
  return 0;
}

export function normalizeGameMode(value = 'time') {
  if (!LUDO_GAME_MODES.includes(value)) throw new Error('Choose Time, Move, or Full Play');
  return value;
}

export function normalizeTimeMinutes(value = 10) {
  const minutes = Number(value);
  if (!LUDO_TIME_OPTIONS.includes(minutes)) throw new Error('Choose a valid time limit');
  return minutes;
}

export function createGame(roomId, maxPlayers = MAX_PLAYERS, timeMinutes = 10, stake = DEFAULT_STAKE, options = {}) {
  const gameMode = normalizeGameMode(options.gameMode);
  const requestedTime = Number(timeMinutes);
  const configuredTime = gameMode === 'time' ? normalizeTimeMinutes(timeMinutes) : (Number.isFinite(requestedTime) && requestedTime > 0 ? requestedTime : 10);
  const moveLimit = options.moveLimit == null ? null : Number(options.moveLimit);
  if (gameMode === 'moves' && !LUDO_MOVE_LIMIT_OPTIONS.includes(moveLimit)) {
    throw new Error('Choose a move limit of 20, 25, or 30');
  }
  return {
    roomId,
    maxPlayers: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(maxPlayers) || MAX_PLAYERS)),
    timeMinutes: configuredTime,
    gameMode,
    moveLimit: gameMode === 'moves' ? moveLimit : null,
    completedMoves: 0,
    deadlineAt: null,
    turnDeadlineAt: null,
    turnTransitionUntil: null,
    draw: false,
    stake: 0,
    status: 'waiting',
    players: [],
    currentPlayer: 0,
    diceValue: null,
    diceRolled: false,
    winner: null,
    winReason: null,
    turnNumber: 1,
    sixesInRow: 0,
  };
}

export function autoStartIfReady(game) {
  if (game.status !== 'waiting') return game;
  if (game.players.length < MIN_PLAYERS) return game;
  if (game.players.length !== game.maxPlayers) return game;

  game.status = 'playing';
  game.currentPlayer = 0;
  game.turnNumber = 1;
  game.diceValue = null;
  game.diceRolled = false;
  game.completedMoves = 0;
  game.deadlineAt = null;
  game.turnDeadlineAt = null;
  game.turnTransitionUntil = null;
  game.winner = null;
  game.winReason = null;
  game.draw = false;
  game.players.forEach((player) => {
    player.tokenScores = createTokenScores();
    player.score = 0;
  });
  return game;
}

// Two players always sit in opposite yards (green faces blue), three players
// take the two opposite yards first, and a full room uses every yard.
export function colorForSeat(maxPlayers, seatIndex) {
  const seat = Math.max(0, Number(seatIndex) || 0);
  if (Number(maxPlayers) === MIN_PLAYERS) return TWO_PLAYER_COLORS[seat % TWO_PLAYER_COLORS.length];
  if (Number(maxPlayers) === 3) return THREE_PLAYER_COLORS[seat % THREE_PLAYER_COLORS.length];
  return LUDO_COLORS[seat % LUDO_COLORS.length];
}

// Colours whose start cells are half a lap apart sit in opposite yards.
export function areOppositeColors(firstColor, secondColor) {
  const difference = Math.abs((START_CELLS[firstColor] ?? 0) - (START_CELLS[secondColor] ?? 0));
  return difference === TRACK_LENGTH / 2;
}

export function addPlayer(game, { userId, username, socketId, isBot = false }) {
  if (game.status !== 'waiting') throw new Error('Game has already started');
  if (game.players.length >= game.maxPlayers) throw new Error('Room is full');

  const existingPlayer = game.players.find((player) => player.userId === userId);
  if (existingPlayer) {
    if (existingPlayer.connected) throw new Error('You are already in this room');
    existingPlayer.username = username || existingPlayer.username || 'Player';
    existingPlayer.socketId = socketId;
    existingPlayer.connected = true;
    delete existingPlayer.disconnectedAt;
    return game;
  }

  const color = colorForSeat(game.maxPlayers, game.players.length);
  game.players.push({ userId, username: username || 'Player', socketId, isBot, color, connected: true, tokens: createTokens(), tokenScores: createTokenScores(), score: 0 });
  return game;
}

export function reconnectPlayer(game, userId, socketId, username) {
  const player = game.players.find((item) => item.userId === userId);
  if (!player) return false;
  player.socketId = socketId;
  player.username = username || player.username;
  player.connected = true;
  delete player.disconnectedAt;
  return true;
}

export function removePlayer(game, userId, hardRemove = false) {
  const player = game.players.find((item) => item.userId === userId);
  if (!player) return game;
  if (hardRemove) {
    game.players = game.players.filter((item) => item.userId !== userId);
    return game;
  }
  player.connected = false;
  return game;
}

export function startGame(game, userId) {
  if (!game.players.some((player) => player.userId === userId)) throw new Error('You are not in this room');
  if (game.players[0]?.userId !== userId) throw new Error('Only the host can start the game');
  if (game.status !== 'waiting') throw new Error('Game has already started');
  if (game.players.length !== game.maxPlayers) throw new Error('Waiting for all players to join');
  game.status = 'playing';
  game.currentPlayer = 0;
  game.turnNumber = 1;
  game.diceValue = null;
  game.diceRolled = false;
  game.completedMoves = 0;
  game.deadlineAt = null;
  game.turnDeadlineAt = null;
  game.turnTransitionUntil = null;
  game.winner = null;
  game.winReason = null;
  game.draw = false;
  game.players.forEach((player) => {
    player.tokenScores = createTokenScores();
    player.score = 0;
  });
  return game;
}

export function getPlayer(game, userId) {
  return game.players.find((player) => player.userId === userId);
}

export function getPlayerIndex(game, userId) {
  return game.players.findIndex((player) => player.userId === userId);
}

export function getCurrentPlayer(game) {
  return game.players[game.currentPlayer];
}

export function getGlobalPosition(color, tokenPosition) {
  // Local position 50 is the turn into home; 51 onward is private lane.
  if (tokenPosition < 0 || tokenPosition >= 51) return null;
  return (PLAYER_HOME_PATHS[color] + tokenPosition) % TRACK_LENGTH;
}

function getNextTokenPosition(position, diceValue) {
  if (position === -1) return diceValue === 6 ? 0 : null;
  if (!Number.isInteger(position) || position < 0 || position >= FINAL_POSITION) return null;

  const remainingDistance = FINAL_POSITION - position;
  if (diceValue > remainingDistance) return null;
  return position + diceValue;
}

export function canMoveToken(game, userId, tokenIndex, diceValue = game.diceValue) {
  const player = getPlayer(game, userId);
  if (!player || game.status !== 'playing' || getCurrentPlayer(game)?.userId !== userId) return false;
  if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex >= TOKENS_PER_PLAYER) return false;
  if (!Number.isInteger(diceValue) || diceValue < 1 || diceValue > 6) return false;
  const position = player.tokens[tokenIndex];
  // A token may move within the home stretch, or finish exactly when the roll
  // equals its remaining distance. Overshoots and already-finished tokens fail.
  return getNextTokenPosition(position, diceValue) !== null;
}

export function getValidMoves(game, userId, diceValue = game.diceValue) {
  return Array.from({ length: TOKENS_PER_PLAYER }, (_, index) => index).filter((index) => canMoveToken(game, userId, index, diceValue));
}

export function getAutomaticMove(validMoves) {
  return Array.isArray(validMoves) && validMoves.length === 1 ? validMoves[0] : null;
}

export function finishGameByScore(game, reason) {
  if (game.status !== 'playing') return game.winner;
  const standings = game.players.map((player) => ({
    player,
    score: Number(player.score) || 0,
    finishedTokens: player.tokens.filter((position) => position === FINAL_POSITION).length,
    progress: player.tokens.reduce((total, position) => total + (position < 0 ? 0 : position), 0),
  })).sort((first, second) =>
    second.score - first.score ||
    second.finishedTokens - first.finishedTokens ||
    second.progress - first.progress,
  );
  const [leader, runnerUp] = standings;
  const tied = Boolean(leader && runnerUp && leader.score === runnerUp.score && leader.finishedTokens === runnerUp.finishedTokens && leader.progress === runnerUp.progress);
  game.status = 'finished';
  game.winReason = reason;
  game.draw = tied;
  game.winner = !leader || tied ? null : {
    userId: leader.player.userId,
    username: leader.player.username,
    color: leader.player.color,
  };
  game.diceValue = null;
  game.diceRolled = false;
  game.deadlineAt = null;
  game.turnDeadlineAt = null;
  game.turnTransitionUntil = null;
  return game.winner;
}

function captureOpponents(game, movingPlayer, destination) {
  if (destination === null || SAFE_CELLS.has(destination)) return [];
  const captured = [];
  game.players.forEach((player) => {
    if (player.userId === movingPlayer.userId) return;
    player.tokens = player.tokens.map((position, index) => {
      if (getGlobalPosition(player.color, position) === destination) {
        const movementPoints = Number(player.tokenScores?.[index]) || 0;
        player.score = Math.max(0, (Number(player.score) || 0) - movementPoints);
        if (!Array.isArray(player.tokenScores)) player.tokenScores = createTokenScores();
        player.tokenScores[index] = 0;
        captured.push({ userId: player.userId, color: player.color, tokenIndex: index, movementPoints });
        return -1;
      }
      return position;
    });
  });
  return captured;
}

export function advanceTurn(game) {
  if (game.players.length === 0) return game;
  let nextIndex = game.currentPlayer;
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const candidate = (game.currentPlayer + offset) % game.players.length;
    if (game.players[candidate].connected) {
      nextIndex = candidate;
      break;
    }
  }
  game.currentPlayer = nextIndex;
  game.turnNumber += 1;
  return game;
}

export function rollDice(game, userId, random = Math.random) {
  if (game.status !== 'playing') throw new Error('Game is not active');
  if (getCurrentPlayer(game)?.userId !== userId) throw new Error('It is not your turn');
  if (game.diceRolled) throw new Error('Move the current dice before rolling again');
  const value = Math.floor(random() * 6) + 1;
  game.diceValue = value;
  game.diceRolled = true;
  game.sixesInRow = value === 6 ? game.sixesInRow + 1 : 0;

  if (game.sixesInRow === 3) {
    game.diceValue = null;
    game.diceRolled = false;
    game.sixesInRow = 0;
    advanceTurn(game);
    return { value, validMoves: [], turnForfeited: true };
  }

  return { value, validMoves: getValidMoves(game, userId, value), turnForfeited: false };
}

export function moveToken(game, userId, tokenIndex) {
  if (!game.diceRolled || game.diceValue === null) throw new Error('Roll the dice first');
  if (!canMoveToken(game, userId, tokenIndex)) throw new Error('That token cannot move with this dice roll');
  const player = getPlayer(game, userId);
  const diceValue = game.diceValue;
  const oldPosition = player.tokens[tokenIndex];
  const nextPosition = getNextTokenPosition(oldPosition, diceValue);
  // Keep this guard adjacent to the mutation as well as in canMoveToken, so no
  // movement entry point can update game state after an overshooting roll.
  if (nextPosition === null) throw new Error('That token cannot move with this dice roll');
  player.tokens[tokenIndex] = nextPosition;
  const destination = getGlobalPosition(player.color, nextPosition);
  const captured = captureOpponents(game, player, destination);
  const finished = player.tokens.every((position) => position === FINAL_POSITION);
  const reachedHome = nextPosition === FINAL_POSITION;
  // Entering from the yard places a token on the start cell; it is not an
  // ordinary movement step for scoring. All on-board movement uses the legal
  // dice distance, including movement through and into the home stretch.
  const steps = oldPosition === -1 ? 1 : diceValue;
  const scoreAwarded = oldPosition === -1 ? 0 : steps;
  if (!Array.isArray(player.tokenScores)) player.tokenScores = createTokenScores();
  player.tokenScores[tokenIndex] = (Number(player.tokenScores[tokenIndex]) || 0) + scoreAwarded;
  player.score = (Number(player.score) || 0) + scoreAwarded;
  game.completedMoves = (Number(game.completedMoves) || 0) + 1;
  game.diceValue = null;
  game.diceRolled = false;
  if (diceValue !== 6) game.sixesInRow = 0;

  if (finished) {
    game.status = 'finished';
    game.winReason = 'tokens';
    game.winner = { userId: player.userId, username: player.username, color: player.color };
    game.turnDeadlineAt = null;
    game.turnTransitionUntil = null;
  } else if (game.gameMode === 'moves' && game.completedMoves >= game.moveLimit) {
    finishGameByScore(game, 'move-limit');
  } else if (diceValue !== 6 && captured.length === 0 && !reachedHome) {
    advanceTurn(game);
  }
  return {
    tokenIndex,
    oldPosition,
    nextPosition,
    steps,
    scoreAwarded,
    completedMoves: game.completedMoves,
    remainingMoves: game.gameMode === 'moves' ? Math.max(0, game.moveLimit - game.completedMoves) : null,
    captured,
    extraTurn: game.status !== 'finished' && (diceValue === 6 || captured.length > 0 || reachedHome),
    winner: game.winner,
  };
}

// A live game is decided by walkover once every other seat has been abandoned,
// so the remaining human player collects the pot instead of it being refunded.
export function awardWalkover(game, leftUserId) {
  if (game.status !== 'playing') return null;
  const remaining = game.players.filter((player) => player.userId !== leftUserId);
  const survivors = remaining.filter((player) => !player.isBot);
  if (survivors.length !== 1) return null;

  const [winner] = survivors;
  game.status = 'finished';
  game.winReason = 'walkover';
  game.winner = { userId: winner.userId, username: winner.username, color: winner.color };
  game.diceValue = null;
  game.diceRolled = false;
  game.sixesInRow = 0;
  game.turnDeadlineAt = null;
  game.turnTransitionUntil = null;
  return game.winner;
}

export function serializeGame(game) {
  const publicGame = clone(game);
  publicGame.gameMode ||= 'time';
  publicGame.timeMinutes ||= 10;
  publicGame.moveLimit ??= null;
  publicGame.completedMoves = Number(publicGame.completedMoves) || 0;
  publicGame.deadlineAt ??= null;
  publicGame.turnDeadlineAt ??= null;
  publicGame.turnTransitionUntil ??= null;
  publicGame.draw = Boolean(publicGame.draw);
  publicGame.players = publicGame.players.map(({ socketId, ...player }) => player);
  delete publicGame.sixesInRow;
  publicGame.pot = calculatePot(game);
  return publicGame;
}
