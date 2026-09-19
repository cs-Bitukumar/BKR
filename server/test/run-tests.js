import assert from 'node:assert/strict';
import './ludo-path-tests.js';
import './spinner-tests.js';
import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import WalletTransaction from '../models/walletTransactionModel.js';
import {
  SAFE_CELLS,
  BOT_USER_ID,
  STAKE_OPTIONS,
  addPlayer,
  areOppositeColors,
  awardWalkover,
  calculatePot,
  canMoveToken,
  createGame,
  getGlobalPosition,
  getValidMoves,
  moveToken,
  normalizeStake,
  reconnectPlayer,
  removePlayer,
  rollDice,
  serializeGame,
  startGame,
} from '../ludo/gameEngine.js';
import { createLudoSocket, detachSocketFromRoom, normalizeSocketRoom } from '../ludo/ludoSocket.js';
import { createSpinnerSocket } from '../spinner/spinnerSocket.js';

const user = new User({ username: 'tester', email: 'tester@gmail.com', password: 'password123' });
assert.equal(user.role, 'user');
assert.equal(user.balance, 0);
assert.equal(user.validateSync(), undefined);
assert.ok(new Bet({}).validateSync().errors.user);
assert.ok(new WalletTransaction({}).validateSync().errors.user);
console.log('Server model tests passed');

const game = createGame('TEST01', 2);
addPlayer(game, { userId: 'one', username: 'One', socketId: 'socket-one' });
addPlayer(game, { userId: 'two', username: 'Two', socketId: 'socket-two' });
assert.equal(game.status, 'waiting');
startGame(game, 'one');
assert.throws(() => addPlayer(game, { userId: 'three' }), /Game has already started/);
assert.throws(() => rollDice(game, 'two', () => 0.5), /not your turn/);
assert.deepEqual(rollDice(game, 'one', () => 5).validMoves, []);
assert.equal(canMoveToken(game, 'one', 0), false);
assert.throws(() => moveToken(game, 'one', 0), /cannot move/);

game.diceValue = null;
game.diceRolled = false;
assert.deepEqual(rollDice(game, 'one', () => 0.999).validMoves, [0, 1, 2, 3]);
moveToken(game, 'one', 0);
assert.equal(game.players[0].tokens[0], 0);
assert.equal(game.currentPlayer, 0, 'rolling a six grants an extra turn');

removePlayer(game, 'two');
assert.equal(game.players[1].connected, false);
assert.equal(reconnectPlayer(game, 'two', 'new-socket', 'Two'), true);
assert.equal(game.players[1].connected, true);

// A two-player room seats green against blue, so local positions are matched
// through the global track: green starts on 13 and blue on 39.
assert.equal(game.players.map((player) => player.color).join(','), 'green,blue', 'a duel sits in opposite homes');

game.players[0].tokens[0] = 7;
game.players[1].tokens[0] = 47;
game.diceValue = 1;
game.diceRolled = true;
const safeMove = moveToken(game, 'one', 0);
assert.equal(safeMove.captured.length, 0, 'safe cells cannot capture');

game.players[0].tokens[0] = 6;
game.players[1].tokens[0] = 33;
game.currentPlayer = 0;
game.diceValue = 1;
game.diceRolled = true;
const captureMove = moveToken(game, 'one', 0);
assert.equal(captureMove.captured.length, 1, 'opponent on an unsafe cell is captured');
assert.equal(game.players[1].tokens[0], -1);
assert.equal(getGlobalPosition('red', 0), 0);
assert.equal(SAFE_CELLS.has(0), true);

game.players[0].tokens = [56, 57, 57, 57];
game.players[1].tokens = [-1, -1, -1, -1];
game.currentPlayer = 0;
game.diceValue = 1;
game.diceRolled = true;
moveToken(game, 'one', 0);
assert.equal(game.status, 'finished');
assert.equal(game.winner.color, 'green');
assert.equal(game.winReason, 'tokens', 'finishing every token is the normal win reason');

const fourPlayerGame = createGame('TEST04', 4);
['one', 'two', 'three', 'four'].forEach((userId) => addPlayer(fourPlayerGame, { userId }));
assert.equal(fourPlayerGame.status, 'waiting');
assert.throws(() => addPlayer(fourPlayerGame, { userId: 'five' }), /Room is full/);
startGame(fourPlayerGame, 'one');
assert.equal(fourPlayerGame.status, 'playing');

const staleRoomGame = createGame('TEST05', 2);
addPlayer(staleRoomGame, { userId: 'same-user', username: 'Same', socketId: 'old-socket' });
removePlayer(staleRoomGame, 'same-user');
assert.doesNotThrow(() => addPlayer(staleRoomGame, { userId: 'same-user', username: 'Same', socketId: 'new-socket' }));

const waitingGame = createGame('TEST06', 2);
addPlayer(waitingGame, { userId: 'host', username: 'Host', socketId: 'host-socket' });
assert.throws(() => startGame(waitingGame, 'host'), /Waiting for all players to join/);
addPlayer(waitingGame, { userId: 'guest', username: 'Guest', socketId: 'guest-socket' });
assert.equal(waitingGame.status, 'waiting');
assert.throws(() => startGame(waitingGame, 'guest'), /Only the host can start the game/);
startGame(waitingGame, 'host');
assert.equal(waitingGame.status, 'playing');

const autoStartGame = createGame('TEST07', 3);
addPlayer(autoStartGame, { userId: 'a', username: 'A', socketId: 'a-socket' });
addPlayer(autoStartGame, { userId: 'b', username: 'B', socketId: 'b-socket' });
assert.equal(autoStartGame.status, 'waiting');
addPlayer(autoStartGame, { userId: 'c', username: 'C', socketId: 'c-socket' });
assert.equal(autoStartGame.status, 'waiting');
assert.equal(autoStartGame.players.length, 3);
assert.equal(autoStartGame.currentPlayer, 0);
startGame(autoStartGame, 'a');
assert.equal(autoStartGame.status, 'playing');

const botGame = createGame('TEST-BOT', 2);
addPlayer(botGame, { userId: 'human', username: 'Human', socketId: 'human-socket' });
addPlayer(botGame, { userId: BOT_USER_ID, username: 'BKR Bot', isBot: true });
assert.equal(botGame.status, 'waiting');
startGame(botGame, 'human');
assert.equal(botGame.status, 'playing');
assert.equal(botGame.players[1].isBot, true);
assert.deepEqual(rollDice(botGame, 'human', () => 0.999).validMoves, [0, 1, 2, 3]);

const threeSixGame = createGame('TEST-THREE-SIXES', 2);
addPlayer(threeSixGame, { userId: 'six-one' });
addPlayer(threeSixGame, { userId: 'six-two' });
startGame(threeSixGame, 'six-one');
rollDice(threeSixGame, 'six-one', () => 0.999);
moveToken(threeSixGame, 'six-one', 0);
rollDice(threeSixGame, 'six-one', () => 0.999);
moveToken(threeSixGame, 'six-one', 1);
const forfeitedSix = rollDice(threeSixGame, 'six-one', () => 0.999);
assert.equal(forfeitedSix.turnForfeited, true);
assert.equal(threeSixGame.currentPlayer, 1, 'three consecutive sixes forfeit the turn');

const homeBonusGame = createGame('TEST-HOME-BONUS', 2);
addPlayer(homeBonusGame, { userId: 'home-one' });
addPlayer(homeBonusGame, { userId: 'home-two' });
startGame(homeBonusGame, 'home-one');
homeBonusGame.players[0].tokens[0] = 56;
homeBonusGame.diceValue = 1;
homeBonusGame.diceRolled = true;
const homeMove = moveToken(homeBonusGame, 'home-one', 0);
assert.equal(homeMove.extraTurn, true, 'reaching home grants another turn');
assert.equal(homeBonusGame.currentPlayer, 0);

const fullRoomRequiresCapacity = createGame('TEST08', 4);
addPlayer(fullRoomRequiresCapacity, { userId: 'x', username: 'X', socketId: 'x-socket' });
addPlayer(fullRoomRequiresCapacity, { userId: 'y', username: 'Y', socketId: 'y-socket' });
assert.throws(() => startGame(fullRoomRequiresCapacity, 'x'), /Waiting for all players to join/);
addPlayer(fullRoomRequiresCapacity, { userId: 'z', username: 'Z', socketId: 'z-socket' });
assert.throws(() => startGame(fullRoomRequiresCapacity, 'x'), /Waiting for all players to join/);
addPlayer(fullRoomRequiresCapacity, { userId: 'w', username: 'W', socketId: 'w-socket' });
assert.equal(fullRoomRequiresCapacity.status, 'waiting');
startGame(fullRoomRequiresCapacity, 'x');
assert.equal(fullRoomRequiresCapacity.status, 'playing');

const staleSocket = { data: { user: { id: 'stale-user' }, roomCode: 'STALE' }, leave: () => {} };
const staleRooms = new Map([['STALE', { code: 'STALE', game: createGame('STALE', 2) }]]);
assert.equal(normalizeSocketRoom(staleSocket, staleRooms), false);
assert.equal(staleSocket.data.roomCode, null);

// Wallet stakes: only the amounts offered by the client are accepted, free play
// stays the default, and the pot scales with the number of seats.
assert.deepEqual(STAKE_OPTIONS, [1, 5, 10, 20, 100]);
assert.equal(normalizeStake(undefined), 0);
assert.equal(normalizeStake(null), 0);
assert.equal(normalizeStake('5'), 5);
assert.equal(normalizeStake(100), 100);
assert.equal(normalizeStake(-20), 0);
assert.equal(normalizeStake('abc'), 0);
assert.throws(() => normalizeStake(3), /valid stake amount/, 'amounts outside the wallet options are rejected');

const freeGame = createGame('TEST-FREE', 2);
assert.equal(freeGame.stake, 0);
assert.equal(calculatePot(freeGame), 0);

const stakeGame = createGame('TEST-STAKE', 2, 10, 20);
assert.equal(stakeGame.stake, 20);
addPlayer(stakeGame, { userId: 'stake-one', username: 'One', socketId: 'stake-one-socket' });
assert.equal(calculatePot(stakeGame), 20);
addPlayer(stakeGame, { userId: 'stake-two', username: 'Two', socketId: 'stake-two-socket' });
assert.equal(calculatePot(stakeGame), 40);
assert.equal(serializeGame(stakeGame).pot, 40);
assert.equal(serializeGame(stakeGame).stake, 20);

const botStakeGame = createGame('TEST-BOT-STAKE', 2, 10, 10);
addPlayer(botStakeGame, { userId: 'solo-human', username: 'Human', socketId: 'solo-socket' });
addPlayer(botStakeGame, { userId: BOT_USER_ID, username: 'BKR Bot', isBot: true });
startGame(botStakeGame, 'solo-human');
assert.equal(botStakeGame.status, 'playing');
assert.equal(calculatePot(botStakeGame), 20, 'the bot seat is funded by the house');

stakeGame.status = 'finished';
stakeGame.winner = { userId: 'stake-one', username: 'One', color: 'red' };
stakeGame.payout = 40;
assert.equal(serializeGame(stakeGame).payout, 40, 'the winning payout is public game state');

// Seating: a duel is played across the board (green faces blue), three players
// take the two opposite yards first, and a full room uses every yard.
const duelGame = createGame('TEST-DUEL', 2);
addPlayer(duelGame, { userId: 'duel-one', username: 'One', socketId: 'duel-one-socket' });
addPlayer(duelGame, { userId: 'duel-two', username: 'Two', socketId: 'duel-two-socket' });
assert.deepEqual(duelGame.players.map((player) => player.color), ['green', 'blue']);
assert.equal(areOppositeColors('green', 'blue'), true, 'the two duel seats sit in opposite yards');
assert.equal(areOppositeColors('red', 'green'), false, 'neighbouring yards are not opposite');

const trioGame = createGame('TEST-TRIO', 3);
['trio-one', 'trio-two', 'trio-three'].forEach((userId) => addPlayer(trioGame, { userId }));
assert.deepEqual(trioGame.players.map((player) => player.color), ['red', 'yellow', 'green']);
assert.equal(areOppositeColors(trioGame.players[0].color, trioGame.players[1].color), true);

const quartetGame = createGame('TEST-QUARTET', 4);
['quartet-one', 'quartet-two', 'quartet-three', 'quartet-four'].forEach((userId) => addPlayer(quartetGame, { userId }));
assert.deepEqual(quartetGame.players.map((player) => player.color), ['red', 'green', 'yellow', 'blue']);

// Walkover: the last human standing wins when the other players leave a live game.
const walkoverGame = createGame('TEST-WALKOVER', 2, 10, 10);
addPlayer(walkoverGame, { userId: 'stay', username: 'Stay', socketId: 'stay-socket' });
addPlayer(walkoverGame, { userId: 'quit', username: 'Quit', socketId: 'quit-socket' });
startGame(walkoverGame, 'stay');
assert.equal(awardWalkover(walkoverGame, 'unknown-user'), null, 'an unknown leaver keeps the game running');
assert.equal(walkoverGame.status, 'playing');
const walkoverWinner = awardWalkover(walkoverGame, 'quit');
assert.equal(walkoverWinner.userId, 'stay');
assert.equal(walkoverWinner.color, 'green');
assert.equal(walkoverGame.status, 'finished');
assert.equal(walkoverGame.winReason, 'walkover');
assert.equal(serializeGame(walkoverGame).winReason, 'walkover');
assert.equal(awardWalkover(walkoverGame, 'stay'), null, 'a finished game is never decided twice');

const partyGame = createGame('TEST-PARTY', 3, 10, 10);
['party-one', 'party-two', 'party-three'].forEach((userId) => addPlayer(partyGame, { userId }));
startGame(partyGame, 'party-one');
assert.equal(awardWalkover(partyGame, 'party-two'), null, 'a three-way game continues while two players remain');
assert.equal(partyGame.status, 'playing');

const soloLeaveGame = createGame('TEST-SOLO-LEAVE', 2, 10, 10);
addPlayer(soloLeaveGame, { userId: 'solo-only', username: 'Solo', socketId: 'solo-only-socket' });
addPlayer(soloLeaveGame, { userId: BOT_USER_ID, username: 'BKR Bot', isBot: true });
startGame(soloLeaveGame, 'solo-only');
assert.equal(awardWalkover(soloLeaveGame, 'solo-only'), null, 'a bot never collects a walkover win');

const roomA = { code: 'ROOMA', game: createGame('ROOMA', 2) };
addPlayer(roomA.game, { userId: 'alice', username: 'Alice', socketId: 'alice-old-socket' });
const roomMap = new Map([['ROOMA', roomA]]);
const socketInOldRoom = { data: { user: { id: 'alice' }, roomCode: 'ROOMA' }, leave: () => {} };
const ioStub = { to: () => ({ emit: () => {} }) };
detachSocketFromRoom(ioStub, socketInOldRoom, 'ROOMA', roomMap);
assert.equal(socketInOldRoom.data.roomCode, null);
assert.equal(roomMap.has('ROOMA'), false);

console.log('Ludo engine tests passed');

// Wallet integration: the socket actions must move real balance through the
// models, so the statics are stubbed instead of talking to MongoDB.
const usersById = {
  'wallet-user': { _id: 'wallet-user', username: 'Wallet', balance: 50 },
  'poor-user': { _id: 'poor-user', username: 'Poor', balance: 0 },
};
const walletTransactions = [];

// Mongoose queries are thenable and chainable, so the stub has to be both.
User.findById = (id) => {
  const walletUser = usersById[id] || null;
  const query = {
    select: () => query,
    then: (resolve, reject) => Promise.resolve(walletUser).then(resolve, reject),
    catch: (reject) => Promise.resolve(walletUser).catch(reject),
  };
  return query;
};
User.findOneAndUpdate = async (filter, update) => {
  const walletUser = usersById[filter._id];
  if (!walletUser || walletUser.balance < filter.balance.$gte) return null;
  walletUser.balance += update.$inc.balance;
  return walletUser;
};
User.findByIdAndUpdate = async (id, update) => {
  const walletUser = usersById[id];
  if (!walletUser) return null;
  walletUser.balance += update.$inc.balance;
  return walletUser;
};
WalletTransaction.create = async (transaction) => {
  walletTransactions.push(transaction);
  return transaction;
};

const connectionHandlers = {};
const emittedEvents = [];
const walletIoStub = {
  use: () => {},
  on: (event, handler) => { connectionHandlers[event] = handler; },
  to: () => ({ emit: (event, payload) => emittedEvents.push({ event, payload }) }),
};
const { rooms: walletRooms } = createLudoSocket(walletIoStub);

function connectWalletSocket(id, userId, username) {
  const handlers = {};
  const socket = {
    id,
    data: { user: { id: userId, username } },
    emit: () => {},
    join: () => {},
    leave: () => {},
    on: (event, handler) => { handlers[event] = handler; },
  };
  connectionHandlers.connection(socket);
  return { socket, handlers };
}

const host = connectWalletSocket('wallet-socket', 'wallet-user', 'Wallet');
const poor = connectWalletSocket('poor-socket', 'poor-user', 'Poor');
assert.equal(typeof host.handlers.createRoom, 'function');
assert.equal(typeof host.handlers.moveToken, 'function');

let createdAck = null;
await host.handlers.createRoom({ singlePlayer: true, timeMinutes: 5, stake: 10 }, (payload) => { createdAck = payload; });
assert.equal(createdAck.ok, true, createdAck.message);
assert.equal(createdAck.game.stake, 10);
assert.equal(createdAck.game.pot, 20, 'a solo pot covers the house funded bot seat');
assert.equal(usersById['wallet-user'].balance, 40, 'the stake is debited when a staked solo game starts');
assert.deepEqual(walletTransactions.map((item) => [item.type, item.amount]), [['bet', -10]]);
assert.ok(
  emittedEvents.some((item) => item.event === 'walletUpdated' && item.payload.balance === 40),
  'the new balance is pushed to the player socket',
);

const walletRoom = walletRooms.get(createdAck.roomCode);
walletRoom.game.players[0].tokens = [56, 57, 57, 57];
walletRoom.game.currentPlayer = 0;
walletRoom.game.diceValue = 1;
walletRoom.game.diceRolled = true;
host.socket.data.lastActionAt = 0;
let winAck = null;
host.handlers.moveToken({ roomCode: createdAck.roomCode, tokenIndex: 0 }, (payload) => { winAck = payload; });
await new Promise((resolve) => { setTimeout(resolve, 0); });
assert.equal(winAck.ok, true, winAck.message);
assert.equal(usersById['wallet-user'].balance, 60, 'the winner is credited the whole pot');
assert.deepEqual(walletTransactions.map((item) => [item.type, item.amount]), [['bet', -10], ['payout', 20]]);
assert.equal(walletRoom.game.payout, 20, 'the payout is part of the public game state');
clearTimeout(walletRoom.botTimer);

let rejectAck = null;
await poor.handlers.createRoom({ singlePlayer: true, stake: 20 }, (payload) => { rejectAck = payload; });
assert.equal(rejectAck.ok, false);
assert.match(rejectAck.message, /Add funds to your wallet/);
assert.equal(usersById['poor-user'].balance, 0, 'a rejected stake never touches the wallet');

poor.socket.data.lastActionAt = 0;
await poor.handlers.createRoom({ singlePlayer: true, stake: 7 }, (payload) => { rejectAck = payload; });
assert.equal(rejectAck.ok, false);
assert.match(rejectAck.message, /valid stake amount/);

poor.socket.data.lastActionAt = 0;
await poor.handlers.createRoom({ singlePlayer: true }, (payload) => { rejectAck = payload; });
assert.equal(rejectAck.ok, true, 'free play still works for an empty wallet');
assert.equal(rejectAck.game.stake, 0);
assert.equal(usersById['poor-user'].balance, 0);
clearTimeout(walletRooms.get(rejectAck.roomCode).botTimer);

// Walkover payout: when one of two staked players leaves a live room the other
// one is declared the winner and the whole pot lands in the winner's wallet.
usersById['duel-host'] = { _id: 'duel-host', username: 'Duel Host', balance: 50 };
usersById['duel-guest'] = { _id: 'duel-guest', username: 'Duel Guest', balance: 50 };
const duelHost = connectWalletSocket('duel-host-socket', 'duel-host', 'Duel Host');
const duelGuest = connectWalletSocket('duel-guest-socket', 'duel-guest', 'Duel Guest');

let duelAck = null;
await duelHost.handlers.createRoom({ maxPlayers: 2, timeMinutes: 5, stake: 10 }, (payload) => { duelAck = payload; });
assert.equal(duelAck.ok, true, duelAck.message);
assert.deepEqual(
  duelAck.game.players.map((player) => player.color),
  ['green'],
  'the host takes the first home of the opposite pair',
);
assert.equal(duelAck.game.pot, 10, 'only the created seat is staked so far');
assert.equal(usersById['duel-host'].balance, 50, 'a waiting room never touches the wallet');

duelGuest.socket.data.lastActionAt = 0;
let joinAck = null;
await duelGuest.handlers.joinRoom({ roomCode: duelAck.roomCode }, (payload) => { joinAck = payload; });
assert.equal(joinAck.ok, true, joinAck.message);
assert.equal(joinAck.game.pot, 20, 'both seats now feed the pot');
assert.deepEqual(
  joinAck.game.players.map((player) => player.color),
  ['green', 'blue'],
  'a two-player room seats the duel in opposite homes',
);
assert.equal(usersById['duel-guest'].balance, 50, 'joining a staked room only checks the balance');

const duelRoom = walletRooms.get(duelAck.roomCode);
duelHost.socket.data.lastActionAt = 0;
let startAck = null;
await duelHost.handlers.startGame({ roomCode: duelAck.roomCode }, (payload) => { startAck = payload; });
assert.equal(startAck.ok, true, startAck.message);
assert.equal(duelRoom.game.status, 'playing');
assert.equal(usersById['duel-host'].balance, 40, 'both stakes are debited when the duel starts');
assert.equal(usersById['duel-guest'].balance, 40);
assert.equal(duelRoom.escrow.amount, 20);

duelGuest.socket.data.lastActionAt = 0;
let duelLeaveAck = null;
duelGuest.handlers.leaveRoom({ roomCode: duelAck.roomCode }, (payload) => { duelLeaveAck = payload; });
await new Promise((resolve) => { setTimeout(resolve, 0); });
assert.equal(duelLeaveAck.ok, true, duelLeaveAck.message);
assert.equal(duelRoom.game.status, 'finished', 'the abandoned duel is decided immediately');
assert.equal(duelRoom.game.winReason, 'walkover');
assert.equal(duelRoom.game.winner.userId, 'duel-host');
assert.equal(duelRoom.game.payout, 20, 'a walkover pays the whole pot');
assert.equal(usersById['duel-host'].balance, 60, 'the surviving player is credited the pot');
assert.equal(usersById['duel-guest'].balance, 40, 'the player who left forfeits the stake');
assert.ok(
  walletTransactions.some((item) => item.type === 'payout' && item.amount === 20 && String(item.user) === 'duel-host'),
  'the walkover writes a payout transaction for the survivor',
);
assert.ok(
  emittedEvents.some((item) => item.event === 'gameFinished' && item.payload.winReason === 'walkover'),
  'every socket in the room is told the game ended by walkover',
);
assert.ok(
  emittedEvents.some((item) => item.event === 'walletUpdated' && item.payload.balance === 60),
  'the winning client is told the new wallet balance',
);
assert.equal(walletRooms.has(duelAck.roomCode), true, 'the room stays open so the winner can see the result');

console.log('Ludo wallet tests passed');


// Spinner socket integration: rooms, bots, per-player pointers and the wallet
// escrow all run through the same stubbed models used by the Ludo wallet tests.
const spinnerHandlers = {};
const spinnerEvents = [];
const spinnerIoStub = {
  use: () => {},
  on: (event, handler) => { spinnerHandlers[event] = handler; },
  to: () => ({ emit: (event, payload) => spinnerEvents.push({ event, payload }) }),
};
const { rooms: spinnerRooms } = createSpinnerSocket(spinnerIoStub);

function connectSpinnerSocket(id, userId, username) {
  const handlers = {};
  const socket = {
    id,
    data: { user: { id: userId, username } },
    emit: () => {},
    join: () => {},
    leave: () => {},
    on: (event, handler) => { handlers[event] = handler; },
  };
  spinnerHandlers.connection(socket);
  return { socket, handlers };
}

usersById['spin-host'] = { _id: 'spin-host', username: 'Spin Host', balance: 50 };
usersById['spin-guest'] = { _id: 'spin-guest', username: 'Spin Guest', balance: 50 };
usersById['spin-third'] = { _id: 'spin-third', username: 'Spin Third', balance: 50 };
usersById['spin-poor'] = { _id: 'spin-poor', username: 'Spin Poor', balance: 0 };

const spinHost = connectSpinnerSocket('spin-host-socket', 'spin-host', 'Spin Host');
assert.equal(typeof spinHost.handlers.createRoom, 'function');
assert.equal(typeof spinHost.handlers.joinRoom, 'function');
assert.equal(typeof spinHost.handlers.spinWheel, 'function');
assert.equal(typeof spinHost.handlers.leaveRoom, 'function');

// Solo play mirrors Ludo: one room code, one human seat and a house funded bot
// in every remaining seat.
let soloAck = null;
await spinHost.handlers.createRoom({ singlePlayer: true, rounds: 2, stake: 10 }, (payload) => { soloAck = payload; });
assert.equal(soloAck.ok, true, soloAck.message);
assert.match(soloAck.roomCode, /^[A-Z0-9]{6}$/, 'a solo spinner room still hands out a six-character code');
assert.equal(soloAck.game.status, 'playing', 'a solo room starts immediately');
assert.equal(soloAck.game.players.length, 2);
assert.equal(soloAck.game.players[0].isBot, false);
assert.equal(soloAck.game.players[1].isBot, true, 'the empty seat is filled by BKR Bot');
assert.deepEqual(soloAck.game.players.map((player) => player.pointerAngle), [0, 180], 'two players get two pointers');
assert.equal(soloAck.game.players[0].socketId, undefined, 'socket ids never leave the server');
assert.equal(soloAck.game.pot, 20, 'the solo pot covers the bot seat');
assert.equal(soloAck.game.rounds, 2);
assert.equal(usersById['spin-host'].balance, 40, 'the stake is debited when a staked solo room starts');
assert.deepEqual(walletTransactions.map((item) => [item.type, item.amount]).slice(-1), [['bet', -10]]);
assert.ok(
  spinnerEvents.some((item) => item.event === 'walletUpdated' && item.payload.balance === 40),
  'the new balance is pushed to the spinner socket',
);

const soloRoom = spinnerRooms.get(soloAck.roomCode);
assert.equal(soloRoom.escrow.collected, true);
assert.equal(soloRoom.escrow.amount, 20);
assert.equal(soloRoom.botTimer, null, 'the host spins first, so no bot turn is queued yet');

spinHost.socket.data.lastActionAt = 0;
let spinAck = null;
spinHost.handlers.spinWheel({ roomCode: soloAck.roomCode }, (payload) => { spinAck = payload; });
assert.equal(spinAck.ok, true, spinAck.message);
assert.equal(Number.isInteger(spinAck.spin.segmentIndex), true);
assert.equal(spinAck.spin.pointerAngle, 0, 'the host spins under the top pointer');
assert.equal(spinAck.spin.username, 'Spin Host');
assert.equal(soloRoom.game.totalSpins, 1);
assert.equal(soloRoom.game.players[0].turnsPlayed, 1);
assert.equal(spinAck.game.players[0].score, spinAck.spin.value);
assert.ok(
  spinnerEvents.some((item) => item.event === 'wheelSpun' && item.payload.value === spinAck.spin.value),
  'the landing slice is broadcast to the room',
);
assert.equal(Boolean(soloRoom.botTimer), true, 'the bot takes the next turn automatically');
assert.equal(soloRoom.game.currentPlayer, 1, 'the turn passes to the bot seat');

// A rejected spin must not move the wheel or the score.
spinHost.socket.data.lastActionAt = 0;
let rejectSpin = null;
spinHost.handlers.spinWheel({ roomCode: soloAck.roomCode }, (payload) => { rejectSpin = payload; });
assert.equal(rejectSpin.ok, false);
assert.match(rejectSpin.message, /not your turn/);
assert.equal(soloRoom.game.totalSpins, 1);


// The pot is settled the moment the last visit of the last round is used, so the
// winning wallet is credited without waiting for another room action.
clearTimeout(soloRoom.botTimer);
soloRoom.botTimer = null;
soloRoom.game.players[0].score = 300;
soloRoom.game.players[0].turnsPlayed = 1;
soloRoom.game.players[1].turnsPlayed = 2;
soloRoom.game.currentPlayer = 0;
spinHost.socket.data.lastActionAt = 0;
let finishAck = null;
spinHost.handlers.spinWheel({ roomCode: soloAck.roomCode }, (payload) => { finishAck = payload; });
await new Promise((resolve) => { setTimeout(resolve, 0); });
assert.equal(finishAck.ok, true, finishAck.message);
assert.equal(finishAck.game.status, 'finished');
assert.equal(finishAck.game.winner.userId, 'spin-host');
assert.equal(finishAck.game.winner.score, 300 + finishAck.spin.value);
assert.equal(soloRoom.game.payout, 20, 'the payout is part of the public game state');
assert.equal(usersById['spin-host'].balance, 60, 'the winner is credited the whole pot');
assert.deepEqual(walletTransactions.map((item) => [item.type, item.amount]).slice(-2), [['bet', -10], ['payout', 20]]);
assert.ok(
  spinnerEvents.some((item) => item.event === 'gameFinished' && item.payload.winner.userId === 'spin-host'),
  'the finished state is broadcast with the winner',
);

// A stake the wallet cannot cover is rejected before the room exists, while free
// play keeps working for an empty wallet.
const spinPoor = connectSpinnerSocket('spin-poor-socket', 'spin-poor', 'Spin Poor');
let poorAck = null;
await spinPoor.handlers.createRoom({ singlePlayer: true, stake: 20 }, (payload) => { poorAck = payload; });
assert.equal(poorAck.ok, false);
assert.match(poorAck.message, /Add funds to your wallet/);
assert.equal(usersById['spin-poor'].balance, 0, 'a rejected stake never touches the wallet');

spinPoor.socket.data.lastActionAt = 0;
await spinPoor.handlers.createRoom({ singlePlayer: true, stake: 7 }, (payload) => { poorAck = payload; });
assert.equal(poorAck.ok, false);
assert.match(poorAck.message, /valid stake amount/);

spinPoor.socket.data.lastActionAt = 0;
await spinPoor.handlers.createRoom({ singlePlayer: true }, (payload) => { poorAck = payload; });
assert.equal(poorAck.ok, true, 'free play still works for an empty wallet');
assert.equal(poorAck.game.stake, 0);
assert.equal(poorAck.game.pot, 0);
assert.equal(usersById['spin-poor'].balance, 0);
clearTimeout(spinnerRooms.get(poorAck.roomCode).botTimer);

// A multiplayer room waits for every seat and the pointers follow the headcount:
// three players sit 120° apart and each of them owns one arrow.
const partyHost = connectSpinnerSocket('spin-party-host-socket', 'spin-host', 'Spin Host');
partyHost.socket.data.lastActionAt = 0;
let partyAck = null;
await partyHost.handlers.createRoom({ maxPlayers: 3, rounds: 3 }, (payload) => { partyAck = payload; });
assert.equal(partyAck.ok, true, partyAck.message);
assert.equal(partyAck.game.status, 'waiting');
assert.equal(partyAck.game.maxPlayers, 3);
assert.deepEqual(partyAck.game.players.map((player) => player.pointerAngle), [0], 'one joined player gets one pointer');
assert.equal(usersById['spin-host'].balance, 60, 'a waiting room never touches the wallet');

const partyGuest = connectSpinnerSocket('spin-party-guest-socket', 'spin-guest', 'Spin Guest');
partyGuest.socket.data.lastActionAt = 0;
let guestJoin = null;
await partyGuest.handlers.joinRoom({ roomCode: partyAck.roomCode }, (payload) => { guestJoin = payload; });
assert.equal(guestJoin.ok, true, guestJoin.message);
assert.equal(guestJoin.game.players.length, 2);
assert.deepEqual(guestJoin.game.players.map((player) => player.pointerAngle), [0, 180], 'the second player adds a second pointer');

const partyThird = connectSpinnerSocket('spin-party-third-socket', 'spin-third', 'Spin Third');
partyThird.socket.data.lastActionAt = 0;
let thirdJoin = null;
await partyThird.handlers.joinRoom({ roomCode: partyAck.roomCode }, (payload) => { thirdJoin = payload; });
assert.equal(thirdJoin.ok, true, thirdJoin.message);
assert.deepEqual(thirdJoin.game.players.map((player) => player.pointerAngle), [0, 120, 240], 'three players sit 120° apart');
assert.deepEqual(thirdJoin.game.players.map((player) => player.color), ['green', 'orange', 'violet']);
assert.ok(
  spinnerEvents.some((item) => item.event === 'playerJoined'),
  'the room is told when a player takes a seat',
);

const partyRoom = spinnerRooms.get(partyAck.roomCode);
partyHost.socket.data.lastActionAt = 0;
let partyStart = null;
await partyHost.handlers.startGame({ roomCode: partyAck.roomCode }, (payload) => { partyStart = payload; });
assert.equal(partyStart.ok, true, partyStart.message);
assert.equal(partyRoom.game.status, 'playing');
assert.equal(usersById['spin-host'].balance, 60, 'a free room never debits the wallet');
assert.equal(usersById['spin-guest'].balance, 50);
assert.equal(usersById['spin-third'].balance, 50);
assert.equal(partyRoom.escrow.amount, 0, 'free rooms keep an empty escrow');

// Once the wheel is rolling the room is closed to new players.
usersById['spin-late'] = { _id: 'spin-late', username: 'Spin Late', balance: 50 };
const spinLate = connectSpinnerSocket('spin-late-socket', 'spin-late', 'Spin Late');
spinLate.socket.data.lastActionAt = 0;
let lateJoin = null;
await spinLate.handlers.joinRoom({ roomCode: partyAck.roomCode }, (payload) => { lateJoin = payload; });
assert.equal(lateJoin.ok, false, 'a started room cannot take another seat');
assert.match(lateJoin.message, /already started/);
assert.equal(Boolean(spinLate.socket.data.roomCode), false, 'the rejected socket is left without a room');

// Walkover: the player who stays collects the pot when the others walk away.
usersById['spin-host'].balance = 50;
usersById['spin-guest'].balance = 50;
const spinDuelHost = connectSpinnerSocket('spin-duel-host-socket', 'spin-host', 'Spin Host');
spinDuelHost.socket.data.lastActionAt = 0;
let spinDuelAck = null;
await spinDuelHost.handlers.createRoom({ maxPlayers: 2, rounds: 4, stake: 10 }, (payload) => { spinDuelAck = payload; });
assert.equal(spinDuelAck.ok, true, spinDuelAck.message);
assert.equal(spinDuelAck.game.players.length, 1, 'a multiplayer room is not filled with bots');

const spinDuelGuest = connectSpinnerSocket('spin-duel-guest-socket', 'spin-guest', 'Spin Guest');
spinDuelGuest.socket.data.lastActionAt = 0;
const spinDuelJoin = await new Promise((resolve) => { spinDuelGuest.handlers.joinRoom({ roomCode: spinDuelAck.roomCode }, resolve); });
assert.equal(spinDuelJoin.ok, true, spinDuelJoin.message);
assert.equal(usersById['spin-host'].balance, 50, 'both seats are ready before the room starts');

spinDuelHost.socket.data.lastActionAt = 0;
const spinDuelStart = await new Promise((resolve) => { spinDuelHost.handlers.startGame({ roomCode: spinDuelAck.roomCode }, resolve); });
assert.equal(spinDuelStart.ok, true, spinDuelStart.message);
const spinDuelRoom = spinnerRooms.get(spinDuelAck.roomCode);
assert.equal(usersById['spin-host'].balance, 40, 'both spinner stakes are debited when the duel starts');
assert.equal(usersById['spin-guest'].balance, 40);
assert.equal(spinDuelRoom.escrow.amount, 20, 'a staked duel escrows the whole pot');

spinDuelGuest.socket.data.lastActionAt = 0;
let spinDuelLeave = null;
spinDuelGuest.handlers.leaveRoom({ roomCode: spinDuelAck.roomCode }, (payload) => { spinDuelLeave = payload; });
await new Promise((resolve) => { setTimeout(resolve, 0); });
assert.equal(spinDuelLeave.ok, true, spinDuelLeave.message);
assert.equal(spinDuelRoom.game.status, 'finished');
assert.equal(spinDuelRoom.game.winReason, 'walkover');
assert.equal(spinDuelRoom.game.winner.userId, 'spin-host');
assert.equal(spinDuelRoom.game.payout, 20);
assert.equal(usersById['spin-host'].balance, 60, 'the surviving player is credited the whole pot');
assert.equal(usersById['spin-guest'].balance, 40, 'the player who left forfeits the stake');
assert.ok(
  spinnerEvents.some((item) => item.event === 'gameFinished' && item.payload.walkover === true),
  'the room is told the spinner game ended by walkover',
);

console.log('Spinner socket tests passed');
