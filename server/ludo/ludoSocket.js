import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import '../config/env.js';
import {
  addPlayer,
  advanceTurn,
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

function publicState(room) {
  return serializeGame(room.game);
}

function emitState(io, room) {
  io.to(room.code).emit('gameState', publicState(room));
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
    if (room.game.players.length === 0) {
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
    socket.on('createRoom', ({ maxPlayers } = {}, ack) => {
      try {
        guardRate(socket);
        if (socket.data.roomCode) throw new Error('You are already in a room');
        const code = createRoomCode();
        const room = { code, game: createGame(code, maxPlayers), cleanupTimer: null };
        addPlayer(room.game, { ...socket.data.user, socketId: socket.id });
        rooms.set(code, room);
        socket.data.roomCode = code;
        socket.join(code);
        success(ack, { roomCode: code, game: publicState(room) });
        socket.emit('gameState', publicState(room));
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('joinRoom', ({ roomCode } = {}, ack) => {
      try {
        guardRate(socket);
        if (socket.data.roomCode) throw new Error('You are already in a room');
        const code = String(roomCode || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) throw new Error('Room not found');
        addPlayer(room.game, { ...socket.data.user, socketId: socket.id });
        socket.data.roomCode = code;
        socket.join(code);
        success(ack, { roomCode: code, game: publicState(room) });
        io.to(code).emit('playerJoined', publicState(room));
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
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('leaveRoom', ({ roomCode } = {}, ack) => {
      try {
        const room = getRoom(socket, roomCode);
        removePlayer(room.game, socket.data.user.id);
        socket.leave(room.code);
        socket.data.roomCode = null;
        if (room.game.status === 'waiting') room.game.players = room.game.players.filter((player) => player.userId !== socket.data.user.id);
        success(ack, { game: publicState(room) });
        if (room.game.players.length === 0) rooms.delete(room.code);
        else { io.to(room.code).emit('playerLeft', publicState(room)); emitState(io, room); }
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('disconnect', () => {
      const code = socket.data.roomCode;
      const room = code && rooms.get(code);
      if (!room) return;
      const player = getPlayer(room.game, socket.data.user.id);
      if (!player || player.socketId !== socket.id) return;
      removePlayer(room.game, socket.data.user.id);
      if (getCurrentPlayer(room.game)?.userId === socket.data.user.id && room.game.status === 'playing') {
        room.game.diceValue = null;
        room.game.diceRolled = false;
        advanceTurn(room.game);
      }
      scheduleDisconnectedCleanup(io, room, socket.data.user.id);
      io.to(room.code).emit('playerDisconnected', publicState(room));
      emitState(io, room);
    });
  });

  return { rooms };
}
