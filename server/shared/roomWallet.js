// Shared wallet escrow for staked, in-memory game rooms.
//
// Every multiplayer game (Ludo, Multiplayer Spinner, ...) stakes real BKR wallet
// balance into a room escrow, refunds it when a room is abandoned and pays the
// pot to the winner. The rules live here so each game only owns its own game
// engine and socket transport.
import User from '../models/userModel.js';
import WalletTransaction from '../models/walletTransactionModel.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(roomMap = new Map()) {
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]).join('');
  } while (roomMap.has(code));
  return code;
}

export function normalizeRoomCode(roomCode) {
  return String(roomCode || '').trim().toUpperCase();
}

export function stakeLabel(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function createEscrow() {
  return { collected: false, settled: false, collecting: false, amount: 0, entries: [] };
}

export function roomPlayer(game, userId) {
  return Array.isArray(game?.players) ? game.players.find((player) => player.userId === userId) : undefined;
}

function gameLabel(room) {
  return room?.gameLabel || 'Game';
}

export function notifyBalance(io, player, balance) {
  if (!player?.socketId) return;
  io.to(player.socketId).emit('walletUpdated', { balance: Number(balance) || 0 });
}

export async function getWalletBalance(userId) {
  const user = await User.findById(userId).select('balance');
  if (!user) throw new Error('User not found');
  return Number(user.balance) || 0;
}

export async function ensureStakeAffordable(userId, stake, mode = 'create') {
  const amount = Number(stake) || 0;
  if (amount <= 0) return;
  if ((await getWalletBalance(userId)) >= amount) return;
  throw new Error(
    mode === 'join'
      ? `This room stakes ${stakeLabel(amount)} per player. Add funds to your wallet to join.`
      : `Add funds to your wallet before staking ${stakeLabel(amount)}.`,
  );
}

// Moves money for one player and keeps the wallet ledger + open client in sync.
export async function moveWallet(io, player, amount, type, title) {
  const user = await User.findByIdAndUpdate(player.userId, { $inc: { balance: amount } }, { new: true });
  if (!user) return;
  await WalletTransaction.create({ user: user._id, type, title, amount, status: 'success' });
  notifyBalance(io, player, user.balance);
}

export async function refundStakes(io, room, entries = []) {
  await Promise.all(entries.map(async ({ userId, amount }) => {
    try {
      await moveWallet(io, roomPlayer(room.game, userId) || { userId }, amount, 'adjustment', `${gameLabel(room)} refund · room ${room.code}`);
    } catch (error) {
      console.error(`${gameLabel(room)} refund failed:`, error.message);
    }
  }));
}

// Stakes are collected once, when the game actually starts, and stay in memory
// until a winner is paid or the room is abandoned.
export async function collectStakes(io, room, pot) {
  const escrow = room.escrow || createEscrow();
  const stake = Number(room.game.stake) || 0;
  room.escrow = escrow;
  if (stake <= 0 || escrow.collected || escrow.collecting) return 0;
  escrow.collecting = true;
  const entries = [];
  try {
    for (const player of room.game.players) {
      if (player.isBot) continue;
      const user = await User.findOneAndUpdate(
        { _id: player.userId, balance: { $gte: stake } },
        { $inc: { balance: -stake } },
        { new: true },
      );
      if (!user) throw new Error(`${player.username} needs ${stakeLabel(stake)} in the wallet to start this game`);
      entries.push({ userId: player.userId, amount: stake });
      await WalletTransaction.create({ user: user._id, type: 'bet', title: `${gameLabel(room)} stake · room ${room.code}`, amount: -stake, status: 'success' });
      notifyBalance(io, player, user.balance);
    }
    room.escrow = { collected: true, settled: false, collecting: false, amount: pot, entries };
    return pot;
  } catch (error) {
    room.escrow = createEscrow();
    await refundStakes(io, room, entries);
    throw error;
  }
}

export function refundOnAbandon(io, room) {
  const escrow = room.escrow;
  if (!escrow?.collected || escrow.settled) return;
  room.escrow = createEscrow();
  refundStakes(io, room, escrow.entries).catch((error) => console.error(`${gameLabel(room)} refund failed:`, error.message));
}

export function settleWinner(io, room) {
  const escrow = room.escrow;
  if (!escrow?.collected || escrow.settled) return;
  escrow.settled = true;
  const pot = escrow.amount;
  const winner = roomPlayer(room.game, room.game.winner?.userId);
  // A bot winning keeps the pot with the house, so the stake is never refunded.
  if (!winner || winner.isBot || pot <= 0) return;
  room.game.payout = pot;
  moveWallet(io, winner, pot, 'payout', `${gameLabel(room)} win · room ${room.code}`).catch((error) => console.error(`${gameLabel(room)} payout failed:`, error.message));
}