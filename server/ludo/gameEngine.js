export const LUDO_COLORS = ['red', 'green', 'yellow', 'blue'];
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOKENS_PER_PLAYER = 4;
export const FINAL_POSITION = 57;
export const BOT_USER_ID = 'ludo-bot';
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const START_CELLS = { red: 0, green: 13, yellow: 26, blue: 39 };
// Two-player and three-player rooms seat the first two players in diagonal
// yards (green/blue or red/yellow) so they always sit opposite each other.
export const TWO_PLAYER_COLORS = ['green', 'blue'];
export const THREE_PLAYER_COLORS = ['red', 'yellow', 'green'];
const TRACK_LENGTH = 52;
export const STAKE_OPTIONS = [1, 5, 10, 20, 100];
export const DEFAULT_STAKE = 0;

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

// A stake of 0 keeps the original free-play behaviour. Any positive amount has
// to match one of the wallet bet options offered by the client.
export function normalizeStake(value) {
  const stake = Number(value);
  if (!Number.isFinite(stake) || stake <= 0) return DEFAULT_STAKE;
  if (!STAKE_OPTIONS.includes(stake)) throw new Error('Choose a valid stake amount');
  return stake;
}

// Every seat contributes one stake to the pot. Bot seats are funded by the
// house so a solo win still pays out a full pot.
export function calculatePot(game) {
  const stake = Number(game?.stake) || 0;
  if (stake <= 0) return 0;
  return stake * (Array.isArray(game?.players) ? game.players.length : 0);
}

export function createGame(roomId, maxPlayers = MAX_PLAYERS, timeMinutes = 10, stake = DEFAULT_STAKE) {
  return {
    roomId,
    maxPlayers: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(maxPlayers) || MAX_PLAYERS)),
    timeMinutes: Math.max(1, Number(timeMinutes) || 10),
    stake: normalizeStake(stake),
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
  game.winner = null;
  game.winReason = null;
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
  game.players.push({ userId, username: username || 'Player', socketId, isBot, color, connected: true, tokens: createTokens() });
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
  game.winner = null;
  game.winReason = null;
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

export function canMoveToken(game, userId, tokenIndex, diceValue = game.diceValue) {
  const player = getPlayer(game, userId);
  if (!player || game.status !== 'playing' || getCurrentPlayer(game)?.userId !== userId) return false;
  if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex >= TOKENS_PER_PLAYER) return false;
  if (!Number.isInteger(diceValue) || diceValue < 1 || diceValue > 6) return false;
  const position = player.tokens[tokenIndex];
  return position === -1 ? diceValue === 6 : position + diceValue <= FINAL_POSITION;
}

export function getValidMoves(game, userId, diceValue = game.diceValue) {
  return Array.from({ length: TOKENS_PER_PLAYER }, (_, index) => index).filter((index) => canMoveToken(game, userId, index, diceValue));
}

function captureOpponents(game, movingPlayer, destination) {
  if (destination === null || SAFE_CELLS.has(destination)) return [];
  const captured = [];
  game.players.forEach((player) => {
    if (player.userId === movingPlayer.userId) return;
    player.tokens = player.tokens.map((position, index) => {
      if (getGlobalPosition(player.color, position) === destination) {
        captured.push({ userId: player.userId, color: player.color, tokenIndex: index });
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
  const nextPosition = oldPosition === -1 ? 0 : oldPosition + diceValue;
  player.tokens[tokenIndex] = nextPosition;
  const destination = getGlobalPosition(player.color, nextPosition);
  const captured = captureOpponents(game, player, destination);
  const finished = player.tokens.every((position) => position === FINAL_POSITION);
  const reachedHome = nextPosition === FINAL_POSITION;
  game.diceValue = null;
  game.diceRolled = false;
  if (diceValue !== 6) game.sixesInRow = 0;

  if (finished) {
    game.status = 'finished';
    game.winReason = 'tokens';
    game.winner = { userId: player.userId, username: player.username, color: player.color };
  } else if (diceValue !== 6 && captured.length === 0 && !reachedHome) {
    advanceTurn(game);
  }
  return {
    tokenIndex,
    oldPosition,
    nextPosition,
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
  return game.winner;
}

export function serializeGame(game) {
  const publicGame = clone(game);
  publicGame.players = publicGame.players.map(({ socketId, ...player }) => player);
  delete publicGame.sixesInRow;
  publicGame.pot = calculatePot(game);
  return publicGame;
}
