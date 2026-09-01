export const LUDO_COLORS = ['red', 'green', 'yellow', 'blue'];
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOKENS_PER_PLAYER = 4;
export const FINAL_POSITION = 57;
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const START_CELLS = { red: 0, green: 13, yellow: 26, blue: 39 };

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

export function createGame(roomId, maxPlayers = MAX_PLAYERS) {
  return {
    roomId,
    maxPlayers: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(maxPlayers) || MAX_PLAYERS)),
    status: 'waiting',
    players: [],
    currentPlayer: 0,
    diceValue: null,
    diceRolled: false,
    winner: null,
    turnNumber: 1,
    sixesInRow: 0,
  };
}

export function addPlayer(game, { userId, username, socketId }) {
  if (game.status !== 'waiting') throw new Error('Game has already started');
  if (game.players.length >= game.maxPlayers) throw new Error('Room is full');
  if (game.players.some((player) => player.userId === userId)) throw new Error('You are already in this room');

  const color = LUDO_COLORS[game.players.length];
  game.players.push({ userId, username: username || 'Player', socketId, color, connected: true, tokens: createTokens() });
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

export function removePlayer(game, userId) {
  const player = game.players.find((item) => item.userId === userId);
  if (player) player.connected = false;
  return game;
}

export function startGame(game, userId) {
  if (!game.players.some((player) => player.userId === userId)) throw new Error('You are not in this room');
  if (game.players[0]?.userId !== userId) throw new Error('Only the host can start the game');
  if (game.players.length < MIN_PLAYERS) throw new Error('At least 2 players are required');
  if (game.status !== 'waiting') throw new Error('Game has already started');
  game.status = 'playing';
  game.currentPlayer = 0;
  game.turnNumber = 1;
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
  if (tokenPosition < 0 || tokenPosition > 51) return null;
  return (PLAYER_HOME_PATHS[color] + tokenPosition) % 52;
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
  return { value, validMoves: getValidMoves(game, userId, value) };
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
  game.diceValue = null;
  game.diceRolled = false;
  game.sixesInRow = 0;

  if (finished) {
    game.status = 'finished';
    game.winner = { userId: player.userId, username: player.username, color: player.color };
  } else if (diceValue !== 6) {
    advanceTurn(game);
  }
  return { tokenIndex, oldPosition, nextPosition, captured, extraTurn: diceValue === 6 && game.status !== 'finished', winner: game.winner };
}

export function serializeGame(game) {
  const publicGame = clone(game);
  publicGame.players = publicGame.players.map(({ socketId, ...player }) => player);
  delete publicGame.sixesInRow;
  return publicGame;
}
