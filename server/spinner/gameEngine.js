// Pure rules for BKR Multiplayer Spinner rooms.
//
// The engine owns the wheel, the seat order, the per-seat pointers and the round
// counter. `spinnerSocket.js` is the only transport that calls into it.
// `client/src/pages/spinner/components/spinnerGeometry.js` mirrors the wheel
// table and the pointer math for rendering; `server/test/spinner-tests.js` keeps
// the two copies in sync.

export const SPINNER_COLORS = ['green', 'orange', 'violet', 'sky'];
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const BOT_USER_ID = 'spinner-bot';
export const BOT_USERNAME = 'BKR Bot';
export const STAKE_OPTIONS = [1, 5, 10, 20, 100];
export const DEFAULT_STAKE = 0;
export const DEFAULT_ROUNDS = 5;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 20;
// Extra full revolutions added to every spin so the wheel always lands forward.
export const FULL_TURNS = 4;

// Eight equal segments; every client draws the same table.
export const SPINNER_SEGMENTS = [
  { label: '10 pts', value: 10, color: '#ffb84d' },
  { label: '25 pts', value: 25, color: '#f76c5e' },
  { label: '50 pts', value: 50, color: '#51c7a3' },
  { label: 'Try again', value: 0, color: '#4c6fff' },
  { label: '100 pts', value: 100, color: '#f28f3b' },
  { label: '75 pts', value: 75, color: '#b07cff' },
  { label: '25 pts', value: 25, color: '#ef5da8' },
  { label: 'Jackpot', value: 250, color: '#62d5ff' },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// A stake of 0 keeps free play. Any positive amount has to match one of the
// wallet bet options offered by the client.
export function normalizeStake(value) {
  const stake = Number(value);
  if (!Number.isFinite(stake) || stake <= 0) return DEFAULT_STAKE;
  if (!STAKE_OPTIONS.includes(stake)) throw new Error('Choose a valid stake amount');
  return stake;
}

export function normalizeRounds(value) {
  const rounds = Number(value);
  if (!Number.isFinite(rounds) || rounds < MIN_ROUNDS) return DEFAULT_ROUNDS;
  return Math.min(MAX_ROUNDS, Math.floor(rounds));
}

// Every seat contributes one stake to the pot. Bot seats are funded by the
// house so a solo win still pays out a full pot.
export function calculateSpinnerPot(game) {
  const stake = Number(game?.stake) || 0;
  if (stake <= 0) return 0;
  return stake * (Array.isArray(game?.players) ? game.players.length : 0);
}

export function createSpinnerGame(roomId, maxPlayers = MAX_PLAYERS, rounds = DEFAULT_ROUNDS, stake = DEFAULT_STAKE) {
  return {
    roomId,
    maxPlayers: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(maxPlayers) || MAX_PLAYERS)),
    rounds: normalizeRounds(rounds),
    stake: normalizeStake(stake),
    status: 'waiting',
    players: [],
    currentPlayer: 0,
    turnNumber: 1,
    totalSpins: 0,
    rotation: 0,
    lastSpin: null,
    winner: null,
    winReason: null,
    payout: 0,
  };
}

export function colorForSeat(seatIndex) {
  const seat = Math.max(0, Number(seatIndex) || 0);
  return SPINNER_COLORS[seat % SPINNER_COLORS.length];
}

// One pointer per seated player, spread evenly around the rim. Two players face
// each other (0° and 180°), three sit 120° apart and a full room uses 0/90/180/270.
export function pointerAngleForSeat(seatIndex, playerCount) {
  const seats = Math.max(1, Math.min(MAX_PLAYERS, Number(playerCount) || 0));
  const seat = Math.max(0, Number(seatIndex) || 0);
  return Number(((seat * 360) / seats).toFixed(4));
}

// Rotation that parks one segment under a seat's pointer. Angles are measured
// clockwise from the top, matching a CSS conic-gradient wheel.
export function rotationForSegment(segmentIndex, pointerAngle, currentRotation = 0, turns = FULL_TURNS) {
  const segmentAngle = 360 / SPINNER_SEGMENTS.length;
  const index = ((Math.floor(Number(segmentIndex) || 0) % SPINNER_SEGMENTS.length) + SPINNER_SEGMENTS.length) % SPINNER_SEGMENTS.length;
  const target = Number(pointerAngle) - (index * segmentAngle + segmentAngle / 2);
  const current = ((Number(currentRotation) % 360) + 360) % 360;
  const delta = ((target - current) % 360 + 360) % 360;
  return Number(currentRotation) + turns * 360 + delta;
}

export function spinWheel(game, userId, random = Math.random) {
  if (game.status !== 'playing') throw new Error('Game is not active');
  const player = getSpinnerPlayer(game, userId);
  if (!player) throw new Error('You are not in this room');
  if (getCurrentSpinnerPlayer(game)?.userId !== userId) throw new Error('It is not your turn');

  const pointerAngle = pointerAngleForSeat(getSpinnerPlayerIndex(game, userId), game.players.length);
  const segmentIndex = Math.floor(random() * SPINNER_SEGMENTS.length) % SPINNER_SEGMENTS.length;
  const segment = SPINNER_SEGMENTS[segmentIndex];
  game.rotation = rotationForSegment(segmentIndex, pointerAngle, game.rotation);

  player.score += segment.value;
  player.turnsPlayed += 1;
  player.spins.push({
    index: segmentIndex,
    label: segment.label,
    value: segment.value,
    color: segment.color,
    rotation: game.rotation,
  });
  game.totalSpins += 1;
  game.lastSpin = {
    playerId: player.userId,
    username: player.username,
    color: player.color,
    pointerAngle,
    segmentIndex,
    label: segment.label,
    value: segment.value,
    segmentColor: segment.color,
    rotation: game.rotation,
    turnNumber: game.turnNumber,
  };

  const spin = { ...game.lastSpin };
  if (isSpinnerRoundComplete(game)) {
    finishSpinnerGame(game);
    return { spin, finished: true, winner: game.winner };
  }
  advanceSpinnerTurn(game);
  return { spin, finished: game.status === 'finished', winner: game.winner };
}

// A live game is decided by walkover once every other seat has been abandoned,
// so the remaining human player collects the pot instead of it being refunded.
export function awardSpinnerWalkover(game, leftUserId) {
  if (game.status !== 'playing') return null;
  const remaining = game.players.filter((player) => player.userId !== leftUserId);
  const survivors = remaining.filter((player) => !player.isBot);
  if (survivors.length !== 1) return null;

  const [winner] = survivors;
  game.status = 'finished';
  game.winReason = 'walkover';
  game.winner = { userId: winner.userId, username: winner.username, color: winner.color, score: winner.score };
  return game.winner;
}

export function serializeSpinnerGame(game) {
  const publicGame = clone(game);
  const total = publicGame.players.length;
  publicGame.players = publicGame.players.map(({ socketId, ...player }, index) => ({
    ...player,
    pointerAngle: pointerAngleForSeat(index, total),
  }));
  publicGame.segmentCount = SPINNER_SEGMENTS.length;
  publicGame.pot = calculateSpinnerPot(game);
  return publicGame;
}

export function addSpinnerPlayer(game, { userId, username, socketId, isBot = false }) {
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

  game.players.push({
    userId,
    username: username || 'Player',
    socketId,
    isBot,
    color: colorForSeat(game.players.length),
    connected: true,
    score: 0,
    turnsPlayed: 0,
    spins: [],
  });
  return game;
}

export function reconnectSpinnerPlayer(game, userId, socketId, username) {
  const player = game.players.find((item) => item.userId === userId);
  if (!player) return false;
  player.socketId = socketId;
  player.username = username || player.username;
  player.connected = true;
  delete player.disconnectedAt;
  return true;
}

export function removeSpinnerPlayer(game, userId, hardRemove = false) {
  const player = game.players.find((item) => item.userId === userId);
  if (!player) return game;
  if (hardRemove) {
    game.players = game.players.filter((item) => item.userId !== userId);
    return game;
  }
  player.connected = false;
  return game;
}

export function getSpinnerPlayer(game, userId) {
  return game.players.find((player) => player.userId === userId);
}

export function getSpinnerPlayerIndex(game, userId) {
  return game.players.findIndex((player) => player.userId === userId);
}

export function getCurrentSpinnerPlayer(game) {
  return game.players[game.currentPlayer];
}

export function startSpinnerGame(game, userId) {
  if (!game.players.some((player) => player.userId === userId)) throw new Error('You are not in this room');
  if (game.players[0]?.userId !== userId) throw new Error('Only the host can start the game');
  if (game.status !== 'waiting') throw new Error('Game has already started');
  if (game.players.length !== game.maxPlayers) throw new Error('Waiting for all players to join');
  game.status = 'playing';
  game.currentPlayer = 0;
  game.turnNumber = 1;
  game.totalSpins = 0;
  game.rotation = 0;
  game.lastSpin = null;
  game.winner = null;
  game.winReason = null;
  game.payout = 0;
  game.players.forEach((player) => {
    player.score = 0;
    player.turnsPlayed = 0;
    player.spins = [];
  });
  return game;
}

function bestSpinValue(player) {
  return (player.spins || []).reduce((best, spin) => Math.max(best, Number(spin.value) || 0), 0);
}

function nextTurnIndex(game) {
  const total = game.players.length;
  for (let offset = 1; offset <= total; offset += 1) {
    const index = (game.currentPlayer + offset) % total;
    const player = game.players[index];
    if (player.connected && player.turnsPlayed < game.rounds) return index;
  }
  return -1;
}

// A round is finished once every seated player has used all of their turns.
export function isSpinnerRoundComplete(game) {
  if (!game.players.length) return false;
  return game.players.every((player) => player.turnsPlayed >= game.rounds);
}

// The highest total wins; the biggest single spin breaks a tie and the earliest
// seat breaks a dead heat.
export function finishSpinnerGame(game) {
  if (game.status !== 'playing') return game;
  const ranked = game.players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => b.player.score - a.player.score || bestSpinValue(b.player) - bestSpinValue(a.player) || a.index - b.index);
  const champion = ranked[0]?.player || null;
  game.status = 'finished';
  game.winReason = 'score';
  game.winner = champion
    ? { userId: champion.userId, username: champion.username, color: champion.color, score: champion.score }
    : null;
  return game;
}

// Absent players forfeit their visit so the round count still completes on time,
// and the turn always lands on a connected player who still owes a spin.
export function advanceSpinnerTurn(game) {
  const total = game.players.length;
  if (!total) return game;
  for (let offset = 1; offset <= total; offset += 1) {
    const candidate = game.players[(game.currentPlayer + offset) % total];
    if (!candidate.connected && candidate.turnsPlayed < game.rounds) candidate.turnsPlayed += 1;
  }
  const nextIndex = nextTurnIndex(game);
  if (nextIndex === -1) {
    finishSpinnerGame(game);
    return game;
  }
  game.currentPlayer = nextIndex;
  game.turnNumber += 1;
  return game;
}