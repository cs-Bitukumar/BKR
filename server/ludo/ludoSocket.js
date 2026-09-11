import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import '../config/env.js';
import {
  addPlayer,
  advanceTurn,
  BOT_USER_ID,
  createGame,
  getCurrentPlayer,
  getPlayer,
  moveToken,
  reconnectPlayer,
  removePlayer,
  rollDice,
  serializeGame,
  startGame,
} from './gameEngine.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const rooms = new Map();
const ACTION_WINDOW_MS = 700;
const CLEANUP_DELAY_MS = 120000;

function createRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function normalizeRoomCode(roomCode) {
  return String(roomCode || '').trim().toUpperCase();
}

function publicState(room) {
  return serializeGame(room.game);
}

export function normalizeSocketRoom(socket, roomMap = rooms) {
  const code = String(socket.data?.roomCode || '').trim().toUpperCase();
  if (!code) return true;

  const room = roomMap.get(code);
  if (!room) {
    socket.data.roomCode = null;
    return false;
  }

  const player = getPlayer(room.game, socket.data.user.id);
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

function scheduleBotTurn(io, room) {
  if (room.botTimer || room.game.status !== 'playing' || !room.game.players.some((player) => !player.isBot) || getCurrentPlayer(room.game)?.userId !== BOT_USER_ID) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    if (room.game.status !== 'playing' || getCurrentPlayer(room.game)?.userId !== BOT_USER_ID) return;
    try {
      const result = rollDice(room.game, BOT_USER_ID);
      io.to(room.code).emit('diceRolled', { value: result.value, playerId: BOT_USER_ID, validMoves: result.validMoves });
      emitState(io, room);

      if (result.validMoves.length) {
        const tokenIndex = result.validMoves[Math.floor(Math.random() * result.validMoves.length)];
        const moveResult = moveToken(room.game, BOT_USER_ID, tokenIndex);
        io.to(room.code).emit('tokenMoved', { ...moveResult, playerId: BOT_USER_ID });
        emitState(io, room);
        if (moveResult.winner) io.to(room.code).emit('gameFinished', publicState(room));
      } else {
        room.game.diceValue = null;
        room.game.diceRolled = false;
        if (result.value !== 6) advanceTurn(room.game);
        emitState(io, room);
      }
      scheduleBotTurn(io, room);
    } catch {
      room.game.diceValue = null;
      room.game.diceRolled = false;
      advanceTurn(room.game);
      emitState(io, room);
    }
  }, 650);
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
    const player = getPlayer(room.game, socket.data.user.id);
    if (player) {
      const wasConnected = player.connected;
      removePlayer(room.game, socket.data.user.id, true);
      if (room.game.players.length === 0 || room.game.players.every((item) => item.isBot)) {
        if (room.botTimer) clearTimeout(room.botTimer);
        roomMap.delete(room.code);
      } else if (wasConnected) {
        io.to(room.code).emit('playerLeft', publicState(room));
        emitState(io, room);
      }
    }
  }

  socket.data.roomCode = null;
  if (socket.leave) socket.leave(code);
  return room;
}

function getRoom(socket, roomCode) {
  const code = String(roomCode || socket.data.roomCode || '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) throw new Error('Room not found');
  if (socket.data.roomCode !== code || !getPlayer(room.game, socket.data.user.id)) throw new Error('You are not a member of this room');
  return room;
}

function reply(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

function failure(socket, ack, message) {
  const payload = { ok: false, message };
  reply(ack, payload);
  socket.emit('ludoError', payload);
}

function success(ack, payload = {}) {
  reply(ack, { ok: true, ...payload });
}

function guardRate(socket) {
  const now = Date.now();
  if (socket.data.lastActionAt && now - socket.data.lastActionAt < ACTION_WINDOW_MS) throw new Error('Please wait a moment before trying again');
  socket.data.lastActionAt = now;
}

function scheduleDisconnectedCleanup(io, room, userId) {
  const player = getPlayer(room.game, userId);
  if (!player) return;
  const disconnectedAt = Date.now();
  player.disconnectedAt = disconnectedAt;
  setTimeout(() => {
    const current = getPlayer(room.game, userId);
    if (!current || current.connected || current.disconnectedAt !== disconnectedAt) return;
    const removedIndex = room.game.players.findIndex((item) => item.userId === userId);
    room.game.players = room.game.players.filter((item) => item.userId !== userId);
    if (room.game.players.length === 0 || room.game.players.every((item) => item.isBot)) {
      if (room.botTimer) clearTimeout(room.botTimer);
      rooms.delete(room.code);
      return;
    }
    if (removedIndex < room.game.currentPlayer) room.game.currentPlayer -= 1;
    if (room.game.currentPlayer >= room.game.players.length) room.game.currentPlayer = 0;
    emitState(io, room);
  }, CLEANUP_DELAY_MS);
}

export function createLudoSocket(io) {
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
    socket.on('createRoom', ({ maxPlayers, singlePlayer, timeMinutes } = {}, ack) => {
      try {
        guardRate(socket);
        detachSocketFromRoom(io, socket);
        normalizeSocketRoom(socket);
        if (socket.data.roomCode) throw new Error('You are already in a room');
        const code = createRoomCode();
        const room = { code, game: createGame(code, singlePlayer ? 2 : maxPlayers, timeMinutes), cleanupTimer: null, botTimer: null };
        addPlayer(room.game, { ...socket.data.user, socketId: socket.id });
        if (singlePlayer) {
          addPlayer(room.game, { userId: BOT_USER_ID, username: 'BKR Bot', isBot: true });
          startGame(room.game, socket.data.user.id);
        }
        rooms.set(code, room);
        socket.data.roomCode = code;
        socket.join(code);
        success(ack, { roomCode: code, game: publicState(room) });
        socket.emit('gameState', publicState(room));
        scheduleBotTurn(io, room);
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('joinRoom', ({ roomCode } = {}, ack) => {
      try {
        guardRate(socket);
        detachSocketFromRoom(io, socket);
        normalizeSocketRoom(socket);
        if (socket.data.roomCode) throw new Error('You are already in a room');
        const code = normalizeRoomCode(roomCode);
        if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('Enter a valid six-character room code');
        const room = rooms.get(code);
        if (!room) throw new Error('Room not found');

        const existingPlayer = getPlayer(room.game, socket.data.user.id);
        const isReconnect = Boolean(existingPlayer);
        if (existingPlayer) {
          reconnectPlayer(room.game, socket.data.user.id, socket.id, socket.data.user.username);
        } else {
          addPlayer(room.game, { ...socket.data.user, socketId: socket.id });
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
        const code = String(roomCode || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room || !reconnectPlayer(room.game, socket.data.user.id, socket.id, socket.data.user.username)) throw new Error('Reconnection room not found or expired');
        socket.data.roomCode = code;
        socket.join(code);
        success(ack, { roomCode: code, game: publicState(room) });
        io.to(code).emit('playerReconnected', publicState(room));
        emitState(io, room);
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('startGame', ({ roomCode } = {}, ack) => {
      try {
        guardRate(socket);
        const room = getRoom(socket, roomCode);
        startGame(room.game, socket.data.user.id);
        success(ack, { game: publicState(room) });
        io.to(room.code).emit('gameStarted', publicState(room));
        emitState(io, room);
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('rollDice', ({ roomCode } = {}, ack) => {
      try {
        guardRate(socket);
        const room = getRoom(socket, roomCode);
        const result = rollDice(room.game, socket.data.user.id);
        success(ack, { value: result.value, validMoves: result.validMoves, game: publicState(room) });
        io.to(room.code).emit('diceRolled', { value: result.value, playerId: socket.data.user.id, validMoves: result.validMoves });
        emitState(io, room);
        if (!result.validMoves.length) {
          room.game.diceValue = null;
          room.game.diceRolled = false;
          if (result.value !== 6) advanceTurn(room.game);
          emitState(io, room);
        }
        scheduleBotTurn(io, room);
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('moveToken', ({ roomCode, tokenIndex } = {}, ack) => {
      try {
        guardRate(socket);
        const room = getRoom(socket, roomCode);
        const result = moveToken(room.game, socket.data.user.id, Number(tokenIndex));
        success(ack, { result, game: publicState(room) });
        io.to(room.code).emit('tokenMoved', { ...result, playerId: socket.data.user.id });
        emitState(io, room);
        if (result.winner) io.to(room.code).emit('gameFinished', publicState(room));
        scheduleBotTurn(io, room);
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('leaveRoom', ({ roomCode } = {}, ack) => {
      try {
        const room = getRoom(socket, roomCode);
        removePlayer(room.game, socket.data.user.id, true);
        socket.leave(room.code);
        socket.data.roomCode = null;
        success(ack, { game: publicState(room) });
        if (room.game.players.length === 0 || room.game.players.every((item) => item.isBot)) {
          if (room.botTimer) clearTimeout(room.botTimer);
          rooms.delete(room.code);
        }
        else { io.to(room.code).emit('playerLeft', publicState(room)); emitState(io, room); }
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('disconnect', () => {
      const code = socket.data.roomCode;
      const room = code && rooms.get(code);
      if (!room) {
        socket.data.roomCode = null;
        return;
      }
      const player = getPlayer(room.game, socket.data.user.id);
      if (!player || player.socketId !== socket.id) {
        socket.data.roomCode = null;
        return;
      }
      removePlayer(room.game, socket.data.user.id);
      if (getCurrentPlayer(room.game)?.userId === socket.data.user.id && room.game.status === 'playing') {
        room.game.diceValue = null;
        room.game.diceRolled = false;
        advanceTurn(room.game);
      }
      socket.data.roomCode = null;
      scheduleDisconnectedCleanup(io, room, socket.data.user.id);
      io.to(room.code).emit('playerDisconnected', publicState(room));
      emitState(io, room);
    });
  });

  return { rooms };
}
