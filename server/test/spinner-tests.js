import assert from 'node:assert/strict';
import {
  MAX_PLAYERS,
  SPINNER_SEGMENTS,
  addSpinnerPlayer,
  advanceSpinnerTurn,
  awardSpinnerWalkover,
  calculateSpinnerPot,
  createSpinnerGame,
  finishSpinnerGame,
  normalizeRounds,
  normalizeStake,
  pointerAngleForSeat,
  rotationForSegment,
  serializeSpinnerGame,
  spinWheel,
  startSpinnerGame,
} from '../spinner/gameEngine.js';
import {
  SEGMENT_ANGLE,
  WHEEL_SEGMENTS,
  pointerAngleForSeat as clientPointerAngleForSeat,
  pointerLabelTransform,
  pointerRotationStyle,
  rotationForSegment as clientRotationForSegment,
  seatColor,
  wheelBackground,
} from '../../client/src/pages/spinner/components/spinnerGeometry.js';

// The client paints the wheel from its own copy of the table, so both ends have
// to describe the exact same eight segments.
assert.deepEqual(WHEEL_SEGMENTS, SPINNER_SEGMENTS, 'the client and server wheel tables must match');
assert.equal(SEGMENT_ANGLE, 360 / SPINNER_SEGMENTS.length);

// One pointer per joined player: 2 face each other, 3 sit 120° apart and a full
// room uses the four quarters.
assert.deepEqual([0, 1, 2, 3].map((seat) => pointerAngleForSeat(seat, 4)), [0, 90, 180, 270]);
assert.deepEqual([0, 1, 2].map((seat) => pointerAngleForSeat(seat, 3)), [0, 120, 240]);
assert.deepEqual([0, 1].map((seat) => pointerAngleForSeat(seat, 2)), [0, 180]);
for (let seat = 0; seat < MAX_PLAYERS; seat += 1) {
  assert.equal(clientPointerAngleForSeat(seat, 3), pointerAngleForSeat(seat, 3), 'pointer math must match the client');
}

assert.deepEqual(pointerRotationStyle(90), { '--pointer-angle': '90deg', transform: 'rotate(90deg)' });
assert.equal(pointerLabelTransform(0), 'translate(calc(-50% + 0%), calc(-50% + -50%))');
assert.equal(pointerLabelTransform(180), 'translate(calc(-50% + 0%), calc(-50% + 50%))');
assert.equal(seatColor('sky'), '#62d5ff');
assert.equal(seatColor('unknown'), '#ffe0a5');

const background = wheelBackground();
SPINNER_SEGMENTS.forEach((segment) => assert.ok(background.includes(segment.color), `${segment.color} must be painted on the wheel`));
assert.equal(background.split('deg').length - 1 >= SPINNER_SEGMENTS.length * 2, true, 'every segment needs a start and an end stop');

// After a spin the winning slice has to rest under the spinning player's arrow.
for (const playerCount of [2, 3, 4]) {
  for (let seat = 0; seat < playerCount; seat += 1) {
    const pointerAngle = pointerAngleForSeat(seat, playerCount);
    for (let segmentIndex = 0; segmentIndex < SPINNER_SEGMENTS.length; segmentIndex += 1) {
      const rotation = rotationForSegment(segmentIndex, pointerAngle, 0);
      const landing = ((pointerAngle - rotation) % 360 + 360) % 360;
      const start = segmentIndex * SEGMENT_ANGLE;
      assert.ok(landing >= start && landing < start + SEGMENT_ANGLE, `seat ${seat} of ${playerCount} must land on segment ${segmentIndex}`);
      assert.equal(rotation > 0, true, 'the wheel always spins forward');
      assert.equal(clientRotationForSegment(segmentIndex, pointerAngle, 0), rotation, 'the client animation must match the server');
      // A second spin keeps the accumulated rotation continuous.
      const next = rotationForSegment((segmentIndex + 3) % SPINNER_SEGMENTS.length, pointerAngle, rotation);
      assert.equal(next > rotation, true, 'each spin continues forward from the previous rotation');
    }
  }
}

assert.equal(normalizeStake(0), 0);
assert.equal(normalizeStake('10'), 10);
assert.throws(() => normalizeStake(7), /valid stake amount/);
assert.equal(normalizeStake(-5), 0, 'a negative stake falls back to free play');
assert.equal(normalizeRounds(0), 5);
assert.equal(normalizeRounds(99), 20);
assert.equal(normalizeRounds(3), 3);

const solo = createSpinnerGame('SOLO01', 2, 1, 10);
addSpinnerPlayer(solo, { userId: 'solo', username: 'Solo', socketId: 'socket-solo' });
addSpinnerPlayer(solo, { userId: 'spinner-bot-1', username: 'Bot', isBot: true });
assert.deepEqual(solo.players.map((player) => player.color), ['green', 'orange']);
assert.throws(() => startSpinnerGame(solo, 'spinner-bot-1'), /Only the host/);
assert.throws(() => spinWheel(solo, 'solo', () => 0), /not active/);
startSpinnerGame(solo, 'solo');
assert.throws(() => startSpinnerGame(solo, 'solo'), /already started/);
assert.throws(() => spinWheel(solo, 'spinner-bot-1', () => 0), /It is not your turn/);
assert.throws(() => addSpinnerPlayer(solo, { userId: 'late' }), /already started/);

const firstSpin = spinWheel(solo, 'solo', () => 0.999);
assert.equal(firstSpin.spin.segmentIndex, SPINNER_SEGMENTS.length - 1);
assert.equal(firstSpin.spin.label, 'Jackpot');
assert.equal(firstSpin.spin.value, 250);
assert.equal(firstSpin.spin.pointerAngle, 0, 'the host spins under the top pointer');
assert.equal(solo.players[0].score, 250);
assert.equal(solo.players[0].turnsPlayed, 1);
assert.equal(firstSpin.finished, false, 'the bot still owes its turn');

const botSpin = spinWheel(solo, 'spinner-bot-1', () => 0.1);
assert.equal(botSpin.spin.pointerAngle, 180, 'the bot spins under the second pointer');
assert.equal(botSpin.finished, true, 'the single round is complete');
assert.equal(solo.status, 'finished');
assert.equal(botSpin.winner.userId, 'solo', 'the higher score wins the room');
assert.equal(botSpin.winner.score, 250);
assert.equal(solo.payout, 0, 'the payout is only written when the pot is settled');

// Walkover only fires when a single human is left alive in a live room.
const duel = createSpinnerGame('DUEL01', 2, 1, 0);
addSpinnerPlayer(duel, { userId: 'host', username: 'Host', socketId: 'socket-host' });
addSpinnerPlayer(duel, { userId: 'guest', username: 'Guest', socketId: 'socket-guest' });
startSpinnerGame(duel, 'host');
assert.equal(awardSpinnerWalkover(duel, 'guest').userId, 'host');
assert.equal(duel.winReason, 'walkover');
assert.equal(awardSpinnerWalkover(duel, 'host'), null, 'a finished room never resolves twice');

// Scores are compared first, the biggest single spin settles a tie and the
// earliest seat breaks a dead heat.
const tied = createSpinnerGame('TIE001', 2, 2, 0);
addSpinnerPlayer(tied, { userId: 'a', username: 'A', socketId: 'socket-a' });
addSpinnerPlayer(tied, { userId: 'b', username: 'B', socketId: 'socket-b' });
startSpinnerGame(tied, 'a');
tied.players[0].score = 40;
tied.players[0].spins = [{ value: 40 }];
tied.players[1].score = 40;
tied.players[1].spins = [{ value: 25 }, { value: 15 }];
finishSpinnerGame(tied);
assert.equal(tied.winner.userId, 'a', 'the biggest single spin breaks the tie');

const deadHeat = createSpinnerGame('TIE002', 2, 1, 0);
addSpinnerPlayer(deadHeat, { userId: 'a', username: 'A', socketId: 'socket-a' });
addSpinnerPlayer(deadHeat, { userId: 'b', username: 'B', socketId: 'socket-b' });
startSpinnerGame(deadHeat, 'a');
deadHeat.players.forEach((player) => { player.score = 10; });
finishSpinnerGame(deadHeat);
assert.equal(deadHeat.winner.userId, 'a', 'the earliest seat takes a dead heat');

// Disconnected players forfeit their visits instead of stalling the room.
const stalled = createSpinnerGame('STALL1', 2, 1, 0);
addSpinnerPlayer(stalled, { userId: 'a', username: 'A', socketId: 'socket-a' });
addSpinnerPlayer(stalled, { userId: 'b', username: 'B', socketId: 'socket-b' });
startSpinnerGame(stalled, 'a');
stalled.players[1].connected = false;
advanceSpinnerTurn(stalled);
assert.equal(stalled.status, 'playing', 'the connected player still gets their spin');
assert.equal(stalled.currentPlayer, 0, 'the turn returns to the only connected player');
assert.equal(stalled.players[1].turnsPlayed, 1, 'the absent player forfeits the visit');
// The room only closes after the player who is still seated has used that visit.
const stalledSpin = spinWheel(stalled, 'a', () => 0);
assert.equal(stalledSpin.finished, true);
assert.equal(stalled.status, 'finished', 'the room closes once no turn is left');
assert.equal(stalled.winner.userId, 'a');

assert.equal(calculateSpinnerPot({ stake: 10, players: [{}, {}, {}] }), 30);
assert.equal(calculateSpinnerPot({ stake: 0, players: [{}, {}] }), 0);

const publicState = serializeSpinnerGame(solo);
assert.equal(publicState.players.every((player) => player.socketId === undefined), true, 'socket ids never leave the server');
assert.deepEqual(publicState.players.map((player) => player.pointerAngle), [0, 180], 'every seat keeps one pointer');
assert.equal(publicState.segmentCount, SPINNER_SEGMENTS.length);
assert.equal(publicState.pot, 20, 'a staked solo room covers the house funded bot seat');
assert.equal(solo.players.length, 2, 'serialising never mutates the live game');

console.log('Spinner engine tests passed');
