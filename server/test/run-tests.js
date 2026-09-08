import assert from 'node:assert/strict';
import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import WalletTransaction from '../models/walletTransactionModel.js';
import {
  SAFE_CELLS,
  addPlayer,
  canMoveToken,
  createGame,
  getGlobalPosition,
  getValidMoves,
  moveToken,
  reconnectPlayer,
  removePlayer,
  rollDice,
  startGame,
} from '../ludo/gameEngine.js';
import { detachSocketFromRoom, normalizeSocketRoom } from '../ludo/ludoSocket.js';

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
assert.throws(() => addPlayer(game, { userId: 'three' }), /Game has already started/);
assert.equal(game.status, 'playing');
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

game.players[0].tokens[0] = 7;
game.players[1].tokens[0] = 47;
game.diceValue = 1;
game.diceRolled = true;
const safeMove = moveToken(game, 'one', 0);
assert.equal(safeMove.captured.length, 0, 'safe cells cannot capture');

game.players[0].tokens[0] = 6;
game.players[1].tokens[0] = 46;
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
assert.equal(game.winner.color, 'red');

const fourPlayerGame = createGame('TEST04', 4);
['one', 'two', 'three', 'four'].forEach((userId) => addPlayer(fourPlayerGame, { userId }));
assert.throws(() => addPlayer(fourPlayerGame, { userId: 'five' }), /Game has already started/);

const staleRoomGame = createGame('TEST05', 2);
addPlayer(staleRoomGame, { userId: 'same-user', username: 'Same', socketId: 'old-socket' });
removePlayer(staleRoomGame, 'same-user');
assert.doesNotThrow(() => addPlayer(staleRoomGame, { userId: 'same-user', username: 'Same', socketId: 'new-socket' }));

const waitingGame = createGame('TEST06', 2);
addPlayer(waitingGame, { userId: 'host', username: 'Host', socketId: 'host-socket' });
assert.throws(() => startGame(waitingGame, 'host'), /Waiting for all players to join/);
addPlayer(waitingGame, { userId: 'guest', username: 'Guest', socketId: 'guest-socket' });
assert.equal(waitingGame.status, 'playing');
assert.throws(() => startGame(waitingGame, 'guest'), /Only the host can start the game/);

const autoStartGame = createGame('TEST07', 3);
addPlayer(autoStartGame, { userId: 'a', username: 'A', socketId: 'a-socket' });
addPlayer(autoStartGame, { userId: 'b', username: 'B', socketId: 'b-socket' });
assert.equal(autoStartGame.status, 'waiting');
addPlayer(autoStartGame, { userId: 'c', username: 'C', socketId: 'c-socket' });
assert.equal(autoStartGame.status, 'playing');
assert.equal(autoStartGame.players.length, 3);
assert.equal(autoStartGame.currentPlayer, 0);
assert.throws(() => startGame(autoStartGame, 'a'), /Game has already started/);

const fullRoomRequiresCapacity = createGame('TEST08', 4);
addPlayer(fullRoomRequiresCapacity, { userId: 'x', username: 'X', socketId: 'x-socket' });
addPlayer(fullRoomRequiresCapacity, { userId: 'y', username: 'Y', socketId: 'y-socket' });
assert.throws(() => startGame(fullRoomRequiresCapacity, 'x'), /Waiting for all players to join/);
addPlayer(fullRoomRequiresCapacity, { userId: 'z', username: 'Z', socketId: 'z-socket' });
assert.throws(() => startGame(fullRoomRequiresCapacity, 'x'), /Waiting for all players to join/);
addPlayer(fullRoomRequiresCapacity, { userId: 'w', username: 'W', socketId: 'w-socket' });
assert.equal(fullRoomRequiresCapacity.status, 'playing');

const staleSocket = { data: { user: { id: 'stale-user' }, roomCode: 'STALE' }, leave: () => {} };
const staleRooms = new Map([['STALE', { code: 'STALE', game: createGame('STALE', 2) }]]);
assert.equal(normalizeSocketRoom(staleSocket, staleRooms), false);
assert.equal(staleSocket.data.roomCode, null);

const roomA = { code: 'ROOMA', game: createGame('ROOMA', 2) };
addPlayer(roomA.game, { userId: 'alice', username: 'Alice', socketId: 'alice-old-socket' });
const roomMap = new Map([['ROOMA', roomA]]);
const socketInOldRoom = { data: { user: { id: 'alice' }, roomCode: 'ROOMA' }, leave: () => {} };
const ioStub = { to: () => ({ emit: () => {} }) };
detachSocketFromRoom(ioStub, socketInOldRoom, 'ROOMA', roomMap);
assert.equal(socketInOldRoom.data.roomCode, null);
assert.equal(roomMap.has('ROOMA'), false);

console.log('Ludo engine tests passed');

