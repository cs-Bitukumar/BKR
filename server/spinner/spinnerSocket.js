import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import '../config/env.js';
import {
  collectStakes,
  createEscrow,
  ensureStakeAffordable,
  generateRoomCode,
  normalizeRoomCode,
  refundOnAbandon,
  refundStakes,
  settleWinner,
} from '../shared/roomWallet.js';
import {
  addSpinnerPlayer,
  advanceSpinnerTurn,
  awardSpinnerWalkover,
  BOT_USER_ID,
  BOT_USERNAME,
  calculateSpinnerPot,
  createSpinnerGame,
  DEFAULT_ROUNDS,
  getCurrentSpinnerPlayer,
  getSpinnerPlayer,
  MAX_PLAYERS,
  reconnectSpinnerPlayer,
  removeSpinnerPlayer,
  serializeSpinnerGame,
  spinWheel,
  startSpinnerGame,
} from './gameEngine.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const rooms = new Map();
const ACTION_WINDOW_MS = 700;
const CLEANUP_DELAY_MS = 120000;
const BOT_SPIN_DELAY_MS = 900;

function createRoomCode() {
  return generateRoomCode(rooms);
}

function publicState(room) {
  return serializeSpinnerGame(room.game);
}

function clearRoomTimer(room, timerName) {
  if (!room?.[timerName]) return;
  clearTimeout(room[timerName]);
  room[timerName] = null;
}

export function normalizeSocketRoom(socket, roomMap = rooms) {
  const code = String(socket.data?.roomCode || '').trim().toUpperCase();
  if (!code) return true;

  const room = roomMap.get(code);
  if (!room) {
    socket.data.roomCode = null;
    return false;
  }

  const player = getSpinnerPlayer(room.game, socket.data.user.id);
  if (!player) {
    socket.data.roomCode = null;
    if (socket.leave) socket.leave(code);
    return false;
  }

  return true;
}

function emitState(io, room) {
  io.to(room.code).emit('gameState', publicState(room));
}

function getRoom(socket, roomCode) {
  const code = String(roomCode || socket.data.roomCode || '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) throw new Error('Room not found');
  if (socket.data.roomCode !== code || !getSpinnerPlayer(room.game, socket.data.user.id)) throw new Error('You are not a member of this room');
  return room;
}

function reply(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

function failure(socket, ack, message) {
  const payload = { ok: false, message };
  reply(ack, payload);
  socket.emit('spinnerError', payload);
}

function success(ack, payload = {}) {
  reply(ack, { ok: true, ...payload });
}

function guardRate(socket) {
  const now = Date.now();
  if (socket.data.lastActionAt && now - socket.data.lastActionAt < ACTION_WINDOW_MS) throw new Error('Please wait a moment before trying again');
  socket.data.lastActionAt = now;
}

// Every open seat is filled with a house funded bot so a solo room mirrors the
// Ludo single-player flow: one human against BKR Bot in the same arena.
function fillWithBots(game) {
  let seat = game.players.length;
  while (game.players.length < game.maxPlayers) {
    addSpinnerPlayer(game, {
      userId: `${BOT_USER_ID}-${seat}`,
      username: `${BOT_USERNAME} ${seat}`,
      isBot: true,
    });
    seat += 1;
  }
  return game;
}

function finishRoom(io, room, walkover = false) {
  settleWinner(io, room);
  emitState(io, room);
  io.to(room.code).emit('gameFinished', { ...publicState(room), walkover });
}

// The last human player left in a live room wins by walkover, which pays out the
// pot with a normal payout transaction instead of refunding the stakes.
function resolveWalkover(io, room, leftUserId) {
  const winner = awardSpinnerWalkover(room.game, leftUserId);
  if (!winner) return null;
  settleWinner(io, room);
  return winner;
}

function scheduleBotSpin(io, room) {
  const currentPlayer = getCurrentSpinnerPlayer(room.game);
  if (room.botTimer || room.game.status !== 'playing' || !currentPlayer?.isBot) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    const bot = getCurrentSpinnerPlayer(room.game);
    if (room.game.status !== 'playing' || !bot?.isBot) return;
    try {
      const result = spinWheel(room.game, bot.userId);
      io.to(room.code).emit('wheelSpun', result.spin);
      emitState(io, room);
      if (result.finished) finishRoom(io, room);
      else scheduleBotSpin(io, room);
    } catch {
      advanceSpinnerTurn(room.game);
      emitState(io, room);
      scheduleBotSpin(io, room);
    }
  }, BOT_SPIN_DELAY_MS);
}

export function detachSocketFromRoom(io, socket, roomCodeOverride, roomMap = rooms) {
  const code = String(roomCodeOverride || socket.data?.roomCode || '').trim().toUpperCase();
  if (!code) return null;

  const room = roomMap.get(code);
  if (!room) {
    socket.data.roomCode = null;
    if (socket.leave) socket.leave(code);
    return null;
  }

  if (socket.data?.user?.id) {
    const player = getSpinnerPlayer(room.game, socket.data.user.id);
    if (player) {
      const wasConnected = player.connected;
      const remainingPlayers = room.game.players.filter((item) => item.userId !== socket.data.user.id);
      const abandoned = remainingPlayers.length === 0 || remainingPlayers.every((item) => item.isBot);
      // The walkover is decided while the leaving player is still seated and the
      // collected stakes are still in escrow, so the survivor is paid the pot.
      const walkover = abandoned ? null : resolveWalkover(io, room, socket.data.user.id);
      if (abandoned) refundOnAbandon(io, room);
      clearRoomTimer(room, 'botTimer');
      const wasCurrent = getCurrentSpinnerPlayer(room.game)?.userId === socket.data.user.id;
      removeSpinnerPlayer(room.game, socket.data.user.id, true);
      if (room.game.currentPlayer >= room.game.players.length) room.game.currentPlayer = 0;
      if (wasCurrent && room.game.status === 'playing') advanceSpinnerTurn(room.game);

      if (abandoned) {
        clearRoomTimer(room, 'cleanupTimer');
        roomMap.delete(room.code);
      } else {
        if (wasConnected && !walkover) io.to(room.code).emit('playerLeft', publicState(room));
        emitState(io, room);
        if (walkover) io.to(room.code).emit('gameFinished', { ...publicState(room), walkover: true });
        else scheduleBotSpin(io, room);
      }
    }
  }

  socket.data.roomCode = null;
  if (socket.leave) socket.leave(code);
  return room;
}

function scheduleDisconnectedCleanup(io, room, userId) {
  const player = getSpinnerPlayer(room.game, userId);
  if (!player) return;
  const disconnectedAt = Date.now();
  player.disconnectedAt = disconnectedAt;
  setTimeout(async () => {
    const current = getSpinnerPlayer(room.game, userId);
    if (!current || current.connected || current.disconnectedAt !== disconnectedAt) return;
    const remainingPlayers = room.game.players.filter((item) => item.userId !== userId);
    if (remainingPlayers.length === 0 || remainingPlayers.every((item) => item.isBot)) {
      clearRoomTimer(room, 'botTimer');
      await refundStakes(io, room, room.escrow?.collected && !room.escrow.settled ? room.escrow.entries : []);
      room.escrow = createEscrow();
      rooms.delete(room.code);
      return;
    }
    const walkover = resolveWalkover(io, room, userId);
    const removedIndex = room.game.players.findIndex((item) => item.userId === userId);
    room.game.players = room.game.players.filter((item) => item.userId !== userId);
    if (removedIndex < room.game.currentPlayer) room.game.currentPlayer -= 1;
    if (room.game.currentPlayer >= room.game.players.length) room.game.currentPlayer = 0;
    emitState(io, room);
    // The reconnect window expired, so the player who stayed wins the pot.
    if (walkover) io.to(room.code).emit('gameFinished', { ...publicState(room), walkover: true });
    else scheduleBotSpin(io, room);
  }, CLEANUP_DELAY_MS);
}
export function createSpinnerSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(payload.id).select('username');
      if (!user) return next(new Error('User not found'));
      socket.data.user = { id: String(user._id), username: user.username };
      next();
    } catch {
      next(new Error('Invalid session'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('createRoom', async ({ maxPlayers, singlePlayer, rounds, stake } = {}, ack) => {
      try {
        guardRate(socket);
        detachSocketFromRoom(io, socket);
        normalizeSocketRoom(socket);
        if (socket.data.roomCode) throw new Error('You are already in a room');
        const seats = Math.min(MAX_PLAYERS, Math.max(2, Number(maxPlayers) || 2));
        const room = {
          code: createRoomCode(),
          gameLabel: 'Spinner',
          game: createSpinnerGame('', seats, rounds ?? DEFAULT_ROUNDS, stake),
          escrow: createEscrow(),
          cleanupTimer: null,
          botTimer: null,
        };
        room.game.roomId = room.code;
        await ensureStakeAffordable(socket.data.user.id, room.game.stake);
        addSpinnerPlayer(room.game, { userId: socket.data.user.id, username: socket.data.user.username, socketId: socket.id });
        rooms.set(room.code, room);
        socket.data.roomCode = room.code;
        socket.join(room.code);

        if (singlePlayer) fillWithBots(room.game);

        // A solo room is ready the moment it is created; multiplayer rooms wait
        // for every seat so the pointer count matches the player count.
        if (room.game.players.length === room.game.maxPlayers) {
          startSpinnerGame(room.game, socket.data.user.id);
          try {
            await collectStakes(io, room, calculateSpinnerPot(room.game));
          } catch (error) {
            socket.leave(room.code);
            socket.data.roomCode = null;
            rooms.delete(room.code);
            throw error;
          }
        }

        success(ack, { roomCode: room.code, game: publicState(room) });
        emitState(io, room);
        if (room.game.status === 'playing') {
          io.to(room.code).emit('gameStarted', publicState(room));
          scheduleBotSpin(io, room);
        }
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('joinRoom', async ({ roomCode } = {}, ack) => {
      try {
        guardRate(socket);
        detachSocketFromRoom(io, socket);
        normalizeSocketRoom(socket);
        if (socket.data.roomCode) throw new Error('You are already in a room');
        const code = normalizeRoomCode(roomCode);
        if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('Enter a valid six-character room code');
        const room = rooms.get(code);
        if (!room) throw new Error('Room not found');

        const existingPlayer = getSpinnerPlayer(room.game, socket.data.user.id);
        const isReconnect = Boolean(existingPlayer);
        if (existingPlayer) {
          reconnectSpinnerPlayer(room.game, socket.data.user.id, socket.id, socket.data.user.username);
        } else {
          await ensureStakeAffordable(socket.data.user.id, room.game.stake, 'join');
          addSpinnerPlayer(room.game, { userId: socket.data.user.id, username: socket.data.user.username, socketId: socket.id });
        }

        socket.data.roomCode = code;
        socket.join(code);
        success(ack, { roomCode: code, game: publicState(room) });
        io.to(code).emit(isReconnect ? 'playerReconnected' : 'playerJoined', publicState(room));
        emitState(io, room);
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('reconnectRoom', ({ roomCode } = {}, ack) => {
      try {
        guardRate(socket);
        const code = normalizeRoomCode(roomCode);
        const room = rooms.get(code);
        if (!room || !reconnectSpinnerPlayer(room.game, socket.data.user.id, socket.id, socket.data.user.username)) throw new Error('Reconnection room not found or expired');
        socket.data.roomCode = code;
        socket.join(code);
        success(ack, { roomCode: code, game: publicState(room) });
        io.to(code).emit('playerReconnected', publicState(room));
        emitState(io, room);
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('startGame', async ({ roomCode } = {}, ack) => {
      let room = null;
      try {
        guardRate(socket);
        room = getRoom(socket, roomCode);
        startSpinnerGame(room.game, socket.data.user.id);
        await collectStakes(io, room, calculateSpinnerPot(room.game));
        success(ack, { game: publicState(room) });
        io.to(room.code).emit('gameStarted', publicState(room));
        emitState(io, room);
        scheduleBotSpin(io, room);
      } catch (error) {
        // A stake that could not be collected must not leave the room locked in
        // a started-but-unfunded state.
        if (room?.game.status === 'playing' && !room.escrow.collected) {
          room.game.status = 'waiting';
          emitState(io, room);
        }
        failure(socket, ack, error.message);
      }
    });

    socket.on('spinWheel', ({ roomCode } = {}, ack) => {
      try {
        guardRate(socket);
        const room = getRoom(socket, roomCode);
        const result = spinWheel(room.game, socket.data.user.id);
        success(ack, { spin: result.spin, game: publicState(room) });
        io.to(room.code).emit('wheelSpun', result.spin);
        emitState(io, room);
        if (result.finished) finishRoom(io, room);
        else scheduleBotSpin(io, room);
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('leaveRoom', async ({ roomCode } = {}, ack) => {
      try {
        const room = getRoom(socket, roomCode);
        const state = publicState(room);
        detachSocketFromRoom(io, socket, room.code);
        success(ack, { game: state });
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('disconnect', () => {
      const code = socket.data.roomCode;
      const room = code && rooms.get(code);
      if (!room) {
        socket.data.roomCode = null;
        return;
      }
      const player = getSpinnerPlayer(room.game, socket.data.user.id);
      if (!player || player.socketId !== socket.id) {
        socket.data.roomCode = null;
        return;
      }
      removeSpinnerPlayer(room.game, socket.data.user.id);
      if (getCurrentSpinnerPlayer(room.game)?.userId === socket.data.user.id && room.game.status === 'playing') {
        clearRoomTimer(room, 'botTimer');
        advanceSpinnerTurn(room.game);
      }
      socket.data.roomCode = null;
      scheduleDisconnectedCleanup(io, room, socket.data.user.id);
      io.to(room.code).emit('playerDisconnected', publicState(room));
      emitState(io, room);
    });
  });

  return { rooms };
}