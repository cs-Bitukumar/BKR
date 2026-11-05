import User from '../models/userModel.js';
import { verifySessionToken } from '../auth/session.js';
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
  addPlayer,
  advanceTurn,
  awardWalkover,
  BOT_USER_ID,
  calculatePot,
  canMoveToken,
  createGame,
  finishGameByScore,
  getCurrentPlayer,
  getAutomaticMove,
  getPlayer,
  moveToken,
  normalizeStake,
  reconnectPlayer,
  removePlayer,
  rollDice,
  serializeGame,
  startGame,
} from './gameEngine.js';

const rooms = new Map();
const ACTION_WINDOW_MS = 700;
const CLEANUP_DELAY_MS = 120000;
const NO_MOVE_DISPLAY_MS = 1000;
const AUTOMATIC_MOVE_DELAY_MS = 1000;
const TURN_LIMIT_MS = 20000;
const TURN_TRANSITION_DELAY_MS = 500;

function createRoomCode() {
  return generateRoomCode(rooms);
}

function publicState(room) {
  return serializeGame(room.game);
}

function clearRoomTimer(room, timerName) {
  if (!room?.[timerName]) return;
  clearTimeout(room[timerName]);
  room[timerName] = null;
}

// The last human player left in a live room wins by walkover, which pays out the
// pot with a normal payout transaction instead of refunding the stakes.
function resolveWalkover(io, room, leftUserId) {
  const winner = awardWalkover(room.game, leftUserId);
  if (!winner) return null;
  clearRoomTimer(room, 'limitTimer');
  clearRoomTimer(room, 'autoMoveTimer');
  clearRoomTimer(room, 'passTimer');
  clearRoomTimer(room, 'botTimer');
  clearRoomTimer(room, 'turnTimer');
  clearRoomTimer(room, 'transitionTimer');
  settleWinner(io, room);
  return winner;
}

function finishLimitedRoom(io, room, broadcast = true) {
  clearRoomTimer(room, 'limitTimer');
  clearRoomTimer(room, 'autoMoveTimer');
  clearRoomTimer(room, 'passTimer');
  clearRoomTimer(room, 'botTimer');
  clearRoomTimer(room, 'turnTimer');
  clearRoomTimer(room, 'transitionTimer');
  if (room.game.winner) settleWinner(io, room);
  else if (room.game.draw) {
    room.game.payout = 0;
    refundOnAbandon(io, room);
  }
  if (broadcast) {
    io.to(room.code).emit('gameFinished', publicState(room));
    emitState(io, room);
  }
}

function scheduleTimeLimit(io, room) {
  clearRoomTimer(room, 'limitTimer');
  if (room.game.gameMode === 'time') {
    const duration = room.game.timeMinutes * 60 * 1000;
    room.game.deadlineAt = Date.now() + duration;
    room.limitTimer = setTimeout(() => {
      room.limitTimer = null;
      if (room.game.status !== 'playing' || room.game.gameMode !== 'time') return;
      finishGameByScore(room.game, 'time-limit');
      finishLimitedRoom(io, room);
    }, duration);
  } else room.game.deadlineAt = null;
  activateTurn(io, room);
}

function enforceMatchDeadline(io, room) {
  if (room.game.status !== 'playing') return false;
  if (room.game.gameMode !== 'time' || !room.game.deadlineAt || Date.now() < room.game.deadlineAt) return true;
  finishGameByScore(room.game, 'time-limit');
  finishLimitedRoom(io, room);
  return false;
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

function activateTurn(io, room) {
  clearRoomTimer(room, 'turnTimer');
  clearRoomTimer(room, 'transitionTimer');
  if (room.game.status !== 'playing') return;
  room.pendingTurn = null;
  room.game.turnTransitionUntil = null;
  room.game.turnDeadlineAt = Date.now() + TURN_LIMIT_MS;
  const expectedTurn = room.game.turnNumber;
  const expectedPlayer = getCurrentPlayer(room.game)?.userId;
  room.turnTimer = setTimeout(() => {
    room.turnTimer = null;
    if (room.game.status !== 'playing' || room.game.turnNumber !== expectedTurn || getCurrentPlayer(room.game)?.userId !== expectedPlayer) return;
    room.game.diceValue = null;
    room.game.diceRolled = false;
    room.game.sixesInRow = 0;
    advanceTurn(room.game);
    activateTurn(io, room);
    emitState(io, room);
    scheduleBotTurn(io, room);
  }, TURN_LIMIT_MS);
  emitState(io, room);
  scheduleBotTurn(io, room);
}

function scheduleTurnTransition(io, room, delay, nextTurn) {
  clearRoomTimer(room, 'turnTimer');
  clearRoomTimer(room, 'transitionTimer');
  room.game.turnDeadlineAt = null;
  room.game.turnTransitionUntil = Date.now() + delay;
  room.pendingTurn = nextTurn;
  room.transitionTimer = setTimeout(() => {
    room.transitionTimer = null;
    if (room.game.status !== 'playing' || !room.pendingTurn) return;
    room.game.currentPlayer = room.pendingTurn.currentPlayer;
    room.game.turnNumber = room.pendingTurn.turnNumber;
    if (!room.game.players[room.game.currentPlayer]?.connected) advanceTurn(room.game);
    activateTurn(io, room);
  }, delay);
}

function commitTokenMove(io, room, userId, tokenIndex) {
  if (!enforceMatchDeadline(io, room)) throw new Error('The match has ended');
  if (!room.game.turnDeadlineAt || Date.now() >= room.game.turnDeadlineAt || room.game.turnTransitionUntil) throw new Error('This turn has expired');
  clearRoomTimer(room, 'autoMoveTimer');
  clearRoomTimer(room, 'passTimer');
  const previousTurn = { currentPlayer: room.game.currentPlayer, turnNumber: room.game.turnNumber };
  const result = moveToken(room.game, userId, Number(tokenIndex));
  const nextTurn = { currentPlayer: room.game.currentPlayer, turnNumber: room.game.turnNumber };
  if (room.game.status === 'playing') {
    room.game.currentPlayer = previousTurn.currentPlayer;
    room.game.turnNumber = previousTurn.turnNumber;
    const animationDuration = Math.max(1, result.steps) * 300 + 300;
    scheduleTurnTransition(io, room, animationDuration + TURN_TRANSITION_DELAY_MS, nextTurn);
  }
  if (room.game.status === 'finished') finishLimitedRoom(io, room, false);
  io.to(room.code).emit('tokenMoved', { ...result, playerId: userId, movementId: `${room.code}:${room.game.turnNumber}:${userId}:${tokenIndex}:${result.nextPosition}` });
  emitState(io, room);
  if (room.game.status === 'finished') io.to(room.code).emit('gameFinished', publicState(room));
  return result;
}

function scheduleAutomaticMove(io, room, userId, tokenIndex, diceValue) {
  clearRoomTimer(room, 'autoMoveTimer');
  room.autoMoveTimer = setTimeout(() => {
    room.autoMoveTimer = null;
    if (
      room.game.status !== 'playing' ||
      getCurrentPlayer(room.game)?.userId !== userId ||
      !room.game.diceRolled ||
      room.game.diceValue !== diceValue ||
      !canMoveToken(room.game, userId, tokenIndex, diceValue)
    ) return;

    try {
      commitTokenMove(io, room, userId, tokenIndex);
    } catch {
      // State may have changed while the move was waiting; a stale automatic
      // move is discarded without affecting the game.
    }
  }, AUTOMATIC_MOVE_DELAY_MS);
}

function scheduleNoMoveResolution(io, room, userId, value) {
  clearRoomTimer(room, 'passTimer');
  room.passTimer = setTimeout(() => {
    room.passTimer = null;
    const currentPlayer = getCurrentPlayer(room.game);
    if (
      room.game.status !== 'playing' ||
      currentPlayer?.userId !== userId ||
      !room.game.diceRolled ||
      room.game.diceValue !== value
    ) return;

    room.game.diceValue = null;
    room.game.diceRolled = false;
    if (value !== 6) advanceTurn(room.game);
    activateTurn(io, room);
    emitState(io, room);
    scheduleBotTurn(io, room);
  }, NO_MOVE_DISPLAY_MS);
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
        const tokenIndex = getAutomaticMove(result.validMoves) ?? result.validMoves[Math.floor(Math.random() * result.validMoves.length)];
        scheduleAutomaticMove(io, room, BOT_USER_ID, tokenIndex, result.value);
      } else {
        scheduleNoMoveResolution(io, room, BOT_USER_ID, result.value);
      }
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
      const removedIndex = room.game.players.findIndex((item) => item.userId === socket.data.user.id);
      const wasCurrentPlayer = getCurrentPlayer(room.game)?.userId === socket.data.user.id;
      const remainingPlayers = room.game.players.filter((item) => item.userId !== socket.data.user.id);
      const abandoned = remainingPlayers.length === 0 || remainingPlayers.every((item) => item.isBot);
      // The walkover is decided while the leaving player is still seated and the
      // collected stakes are still in escrow, so the survivor is paid the pot.
      const walkover = abandoned ? null : resolveWalkover(io, room, socket.data.user.id);
      // Refund while the leaving player is still known, so their open client can
      // refresh the wallet balance before the room disappears.
      if (abandoned) refundOnAbandon(io, room);
      removePlayer(room.game, socket.data.user.id, true);
      if (removedIndex < room.game.currentPlayer) room.game.currentPlayer -= 1;
      if (room.game.currentPlayer >= room.game.players.length) room.game.currentPlayer = 0;
      if (wasCurrentPlayer && !walkover && !abandoned && room.game.status === 'playing') {
        clearRoomTimer(room, 'turnTimer');
        clearRoomTimer(room, 'transitionTimer');
        clearRoomTimer(room, 'passTimer');
        clearRoomTimer(room, 'autoMoveTimer');
        room.pendingTurn = null;
        room.game.diceValue = null;
        room.game.diceRolled = false;
        room.game.sixesInRow = 0;
        room.game.turnNumber += 1;
        activateTurn(io, room);
      }
      if (abandoned) {
        clearRoomTimer(room, 'botTimer');
        clearRoomTimer(room, 'passTimer');
        clearRoomTimer(room, 'autoMoveTimer');
        clearRoomTimer(room, 'limitTimer');
        clearRoomTimer(room, 'turnTimer');
        clearRoomTimer(room, 'transitionTimer');
        roomMap.delete(room.code);
      } else {
        if (wasConnected && !walkover) io.to(room.code).emit('playerLeft', publicState(room));
        emitState(io, room);
        if (walkover) io.to(room.code).emit('gameFinished', publicState(room));
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
  setTimeout(async () => {
    const current = getPlayer(room.game, userId);
    if (!current || current.connected || current.disconnectedAt !== disconnectedAt) return;
    const remainingPlayers = room.game.players.filter((item) => item.userId !== userId);
    if (remainingPlayers.length === 0 || remainingPlayers.every((item) => item.isBot)) {
      clearRoomTimer(room, 'botTimer');
      clearRoomTimer(room, 'passTimer');
      clearRoomTimer(room, 'autoMoveTimer');
      clearRoomTimer(room, 'limitTimer');
      clearRoomTimer(room, 'turnTimer');
      clearRoomTimer(room, 'transitionTimer');
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
    if (walkover) io.to(room.code).emit('gameFinished', publicState(room));
  }, CLEANUP_DELAY_MS);
}

export function createLudoSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = await verifySessionToken(token);
      const user = await User.findById(payload.id).select('username');
      if (!user) return next(new Error('User not found'));
      socket.data.user = { id: String(user._id), username: user.username };
      next();
    } catch {
      next(new Error('Invalid session'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('createRoom', async ({ maxPlayers, singlePlayer, timeMinutes, gameMode = 'time', moveLimit, stake } = {}, ack) => {
      try {
        guardRate(socket);
        detachSocketFromRoom(io, socket);
        normalizeSocketRoom(socket);
        if (socket.data.roomCode) throw new Error('You are already in a room');
        const stakeAmount = singlePlayer ? 0 : normalizeStake(stake);
        await ensureStakeAffordable(socket.data.user.id, stakeAmount);
        const code = createRoomCode();
        const room = { code, gameLabel: 'Ludo', game: createGame(code, singlePlayer ? 2 : maxPlayers, timeMinutes, stakeAmount, { gameMode: singlePlayer ? 'full' : gameMode, moveLimit }), escrow: createEscrow(), cleanupTimer: null, botTimer: null, passTimer: null, autoMoveTimer: null, limitTimer: null, turnTimer: null, transitionTimer: null, pendingTurn: null };
        addPlayer(room.game, { userId: socket.data.user.id, username: socket.data.user.username, socketId: socket.id });
        rooms.set(code, room);
        socket.data.roomCode = code;
        socket.join(code);
        if (singlePlayer) {
          addPlayer(room.game, { userId: BOT_USER_ID, username: 'BKR Bot', isBot: true });
          startGame(room.game, socket.data.user.id);
          try {
            await collectStakes(io, room, calculatePot(room.game));
            scheduleTimeLimit(io, room);
          } catch (error) {
            socket.leave(code);
            socket.data.roomCode = null;
            rooms.delete(code);
            throw error;
          }
        }
        success(ack, { roomCode: code, game: publicState(room) });
        socket.emit('gameState', publicState(room));
        scheduleBotTurn(io, room);
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

        const existingPlayer = getPlayer(room.game, socket.data.user.id);
        const isReconnect = Boolean(existingPlayer);
        if (existingPlayer) {
          reconnectPlayer(room.game, socket.data.user.id, socket.id, socket.data.user.username);
        } else {
          await ensureStakeAffordable(socket.data.user.id, room.game.stake, 'join');
          addPlayer(room.game, { userId: socket.data.user.id, username: socket.data.user.username, socketId: socket.id });
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

    socket.on('startGame', async ({ roomCode } = {}, ack) => {
      let room = null;
      try {
        guardRate(socket);
        room = getRoom(socket, roomCode);
        startGame(room.game, socket.data.user.id);
        await collectStakes(io, room, calculatePot(room.game));
        scheduleTimeLimit(io, room);
        success(ack, { game: publicState(room) });
        io.to(room.code).emit('gameStarted', publicState(room));
        emitState(io, room);
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

    socket.on('rollDice', ({ roomCode } = {}, ack) => {
      try {
        guardRate(socket);
        const room = getRoom(socket, roomCode);
        if (!enforceMatchDeadline(io, room)) throw new Error('The match has ended');
        if (!room.game.turnDeadlineAt || Date.now() >= room.game.turnDeadlineAt || room.game.turnTransitionUntil) throw new Error('This turn has expired');
        const result = rollDice(room.game, socket.data.user.id);
        if (result.turnForfeited && room.game.status === 'playing') scheduleTurnTransition(io, room, TURN_TRANSITION_DELAY_MS, { currentPlayer: room.game.currentPlayer, turnNumber: room.game.turnNumber });
        success(ack, { value: result.value, validMoves: result.validMoves, turnForfeited: result.turnForfeited, game: publicState(room) });
        io.to(room.code).emit('diceRolled', { value: result.value, playerId: socket.data.user.id, validMoves: result.validMoves, turnForfeited: result.turnForfeited });
        emitState(io, room);
        const automaticTokenIndex = getAutomaticMove(result.validMoves);
        if (automaticTokenIndex !== null) {
          scheduleAutomaticMove(io, room, socket.data.user.id, automaticTokenIndex, result.value);
        } else if (!result.validMoves.length && !result.turnForfeited) {
          // Keep the rolled value on the shared board long enough for every
          // player to see it before the automatic pass changes the turn.
          scheduleNoMoveResolution(io, room, socket.data.user.id, result.value);
        }
        scheduleBotTurn(io, room);
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('moveToken', ({ roomCode, tokenIndex } = {}, ack) => {
      try {
        guardRate(socket);
        const room = getRoom(socket, roomCode);
        const result = commitTokenMove(io, room, socket.data.user.id, Number(tokenIndex));
        success(ack, { result, game: publicState(room) });
      } catch (error) { failure(socket, ack, error.message); }
    });

    socket.on('leaveRoom', async ({ roomCode } = {}, ack) => {
      try {
        const room = getRoom(socket, roomCode);
        const leavingCurrentPlayer = getCurrentPlayer(room.game)?.userId === socket.data.user.id;
        const remainingPlayers = room.game.players.filter((item) => item.userId !== socket.data.user.id);
        const roomAbandoned = remainingPlayers.length === 0 || remainingPlayers.every((item) => item.isBot);
        // A player who walks out of a live game hands the pot to the survivor.
        const walkover = roomAbandoned ? null : resolveWalkover(io, room, socket.data.user.id);
        // Refund the collected stakes before the room is torn down. The leaving
        // player is still registered, so their client receives the new balance.
        if (roomAbandoned) refundOnAbandon(io, room);
        clearRoomTimer(room, 'passTimer');
        removePlayer(room.game, socket.data.user.id, true);
        if (room.game.currentPlayer >= room.game.players.length) room.game.currentPlayer = 0;
        if (leavingCurrentPlayer && room.game.status === 'playing') {
          clearRoomTimer(room, 'turnTimer');
          clearRoomTimer(room, 'transitionTimer');
          room.game.diceValue = null;
          room.game.diceRolled = false;
          advanceTurn(room.game);
          activateTurn(io, room);
        }
        socket.leave(room.code);
        socket.data.roomCode = null;
        success(ack, { game: publicState(room) });
        if (roomAbandoned) {
          clearRoomTimer(room, 'botTimer');
          clearRoomTimer(room, 'passTimer');
          clearRoomTimer(room, 'autoMoveTimer');
          clearRoomTimer(room, 'limitTimer');
          clearRoomTimer(room, 'turnTimer');
          clearRoomTimer(room, 'transitionTimer');
          rooms.delete(room.code);
        }
        else {
          if (!walkover) io.to(room.code).emit('playerLeft', publicState(room));
          emitState(io, room);
          if (walkover) io.to(room.code).emit('gameFinished', publicState(room));
        }
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
        clearRoomTimer(room, 'turnTimer');
        clearRoomTimer(room, 'transitionTimer');
        clearRoomTimer(room, 'passTimer');
        clearRoomTimer(room, 'autoMoveTimer');
        room.game.diceValue = null;
        room.game.diceRolled = false;
        advanceTurn(room.game);
        activateTurn(io, room);
      }
      socket.data.roomCode = null;
      scheduleDisconnectedCleanup(io, room, socket.data.user.id);
      io.to(room.code).emit('playerDisconnected', publicState(room));
      emitState(io, room);
    });
  });

  return { rooms };
}
