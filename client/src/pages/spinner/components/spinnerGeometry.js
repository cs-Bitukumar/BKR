// Wheel table and pointer math shared by every Spinner component.
//
// `server/spinner/gameEngine.js` owns the same eight segments and computes the
// landing rotation, so `server/test/spinner-tests.js` compares both copies and
// fails the build whenever they drift apart.
export const WHEEL_SEGMENTS = [
  { label: '10 pts', value: 10, color: '#ffb84d' },
  { label: '25 pts', value: 25, color: '#f76c5e' },
  { label: '50 pts', value: 50, color: '#51c7a3' },
  { label: 'Try again', value: 0, color: '#4c6fff' },
  { label: '100 pts', value: 100, color: '#f28f3b' },
  { label: '75 pts', value: 75, color: '#b07cff' },
  { label: '25 pts', value: 25, color: '#ef5da8' },
  { label: 'Jackpot', value: 250, color: '#62d5ff' },
];

export const SEAT_COLORS = ['green', 'orange', 'violet', 'sky'];
export const MAX_SEATS = 4;
export const SPIN_ANIMATION_MS = 4200;
// Other seats (the house bot) land faster so the arena never lags behind the server.
export const QUICK_SPIN_ANIMATION_MS = 900;
// Kept in sync with the server so both ends animate the same distance.
export const FULL_TURNS = 4;
export const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

export const SEAT_HEX = {
  green: '#39ff14',
  orange: '#ffa94d',
  violet: '#b07cff',
  sky: '#62d5ff',
};

export function seatColor(color) {
  return SEAT_HEX[color] || '#ffe0a5';
}

// The conic-gradient string the wheel is painted with. Segment 0 starts at the
// top (CSS measures conic gradients clockwise from 12 o'clock) which matches
// `rotationForSegment` on both the server and the client.
export function wheelBackground(segments = WHEEL_SEGMENTS) {
  const step = 360 / segments.length;
  const stops = segments.map((segment, index) => {
    const from = (index * step).toFixed(3);
    const to = ((index + 1) * step).toFixed(3);
    return `${segment.color} ${from}deg ${to}deg`;
  });
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
}

// One pointer per joined player, spread evenly around the rim: 2 players face
// each other, 3 sit 120° apart and a full room uses 0/90/180/270.
export function pointerAngleForSeat(seatIndex, playerCount) {
  const seats = Math.max(1, Math.min(MAX_SEATS, Number(playerCount) || 0));
  const seat = Math.max(0, Number(seatIndex) || 0);
  return Number(((seat * 360) / seats).toFixed(4));
}

// Rotation that parks one segment under a seat's pointer, so a spin always
// finishes with the winning slice resting under the active player's arrow.
export function rotationForSegment(segmentIndex, pointerAngle, currentRotation = 0, turns = FULL_TURNS) {
  const index = ((Math.floor(Number(segmentIndex) || 0) % WHEEL_SEGMENTS.length) + WHEEL_SEGMENTS.length) % WHEEL_SEGMENTS.length;
  const target = Number(pointerAngle) - (index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
  const current = ((Number(currentRotation) % 360) + 360) % 360;
  const delta = ((target - current) % 360 + 360) % 360;
  return Number(currentRotation) + turns * 360 + delta;
}

// Pointer markers are full-size overlays rotated around the wheel centre. The
// angle is also exposed as a custom property so the name tag can counter-rotate
// and stay upright at 90°/180°/270°.
export function pointerRotationStyle(angle) {
  const value = Number(angle) || 0;
  return { '--pointer-angle': `${value}deg`, transform: `rotate(${value}deg)` };
}

// Sits the printed label just outside the rim on the pointer's own axis.
export function pointerLabelTransform(angle) {
  const radians = ((Number(angle) || 0) * Math.PI) / 180;
  const x = Number((Math.sin(radians) * 50).toFixed(2));
  const y = Number((-Math.cos(radians) * 50).toFixed(2));
  return `translate(calc(-50% + ${x}%), calc(-50% + ${y}%))`;
}

export function scoreboardRows(players = []) {
  return players.map((player, index) => ({
    ...player,
    seat: index,
    pointerAngle: pointerAngleForSeat(index, players.length),
    hex: seatColor(player.color),
    best: (player.spins || []).reduce((best, spin) => Math.max(best, Number(spin.value) || 0), 0),
  }));
}