// Compatibility layer for game-room code. Rooms are free to create and play:
// there is no escrow, player-to-player transfer, stake, refund, or payout.
export function createEscrow() {
  return { collected: false, settled: false, collecting: false, amount: 0, entries: [] };
}

export async function ensureStakeAffordable() {
  return true;
}

export async function collectStakes(io, room) {
  room.escrow = createEscrow();
  if (room.game) room.game.payout = 0;
  return 0;
}

export async function refundStakes(io, room) {
  room.escrow = createEscrow();
}

export function refundOnAbandon(io, room) {
  room.escrow = createEscrow();
  if (room.game) room.game.payout = 0;
}

export function settleWinner(io, room) {
  if (room.game) room.game.payout = 0;
  room.escrow = { ...createEscrow(), settled: true };
}
import { randomBytes } from 'node:crypto';

export function generateRoomCode() {
  return randomBytes(5).toString('base64url').slice(0, 6).toUpperCase();
}

export function normalizeRoomCode(value) {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : '';
}

