import assert from 'node:assert/strict';
import { LUDO_GAME_MODES, LUDO_MOVE_LIMIT_OPTIONS, LUDO_TIME_OPTIONS, addPlayer, canMoveToken, createGame, finishGameByScore, getAutomaticMove, getGlobalPosition, getValidMoves, moveToken, serializeGame, startGame } from '../ludo/gameEngine.js';
import { HOME_LANES, HOME_SCORE_ANCHORS, STARTS, TRACK_COORDS, positionForToken } from '../../client/src/pages/ludo/components/boardGeometry.js';

const entryCells = { red: [7, 0], green: [0, 7], yellow: [7, 14], blue: [14, 7] };
const finishCells = { red: [7, 6], green: [6, 7], yellow: [7, 8], blue: [8, 7] };
const firstLaneCells = { red: [7, 1], green: [1, 7], yellow: [7, 13], blue: [13, 7] };

assert.deepEqual(HOME_SCORE_ANCHORS, {
  red: { left: '8%', top: '3.8%' },
  green: { left: '68%', top: '3.8%' },
  blue: { left: '8%', bottom: '3.8%' },
  yellow: { left: '68%', bottom: '3.8%' },
}, 'each score badge stays anchored in its corresponding home quadrant');
assert.deepEqual(LUDO_GAME_MODES, ['time', 'moves', 'full']);
assert.deepEqual(LUDO_TIME_OPTIONS, [5, 10, 15, 30]);
assert.deepEqual(LUDO_MOVE_LIMIT_OPTIONS, [20, 25, 30]);
assert.equal(createGame('LEGACY-MODE', 2, 10).gameMode, 'time', 'rooms without new mode settings remain timed rooms');
assert.throws(() => createGame('BAD-MODE', 2, 10, 0, { gameMode: 'moves', moveLimit: 10 }), /move limit/);
assert.throws(() => createGame('BAD-MODE', 2, 10, 0, { gameMode: 'invalid' }), /Time, Move, or Full Play/);

for (const color of Object.keys(STARTS)) {
  assert.deepEqual(positionForToken(color, 50, 0), entryCells[color]);
  assert.deepEqual(positionForToken(color, 51, 0), firstLaneCells[color]);
  for (let position = 0; position <= 50; position += 1) {
    assert.deepEqual(positionForToken(color, position, 0), TRACK_COORDS[getGlobalPosition(color, position)]);
  }
  for (let position = 51; position <= 55; position += 1) {
    assert.equal(getGlobalPosition(color, position), null, 'home lanes are not shared capture cells');
    assert.deepEqual(positionForToken(color, position, 0), HOME_LANES[color][position - 51]);
  }
  assert.deepEqual(positionForToken(color, 56, 0), finishCells[color], 'the final position renders in the color home');
  for (let position = 50; position < 55; position += 1) {
    const from = positionForToken(color, position, 0);
    const to = positionForToken(color, position + 1, 0);
    assert.equal(Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]), 1, 'entry and home steps must be adjacent');
  }
  const lastLane = positionForToken(color, 55, 0);
  const finish = positionForToken(color, 56, 0);
  assert.equal(Math.abs(lastLane[0] - finish[0]) + Math.abs(lastLane[1] - finish[1]), 1,
    'the last home lane step must connect to the final home cell');

  const game = createGame(`LANE-${color}`, 4);
  ['red', 'green', 'yellow', 'blue'].forEach((userId) => addPlayer(game, { userId }));
  startGame(game, 'red');
  const index = game.players.findIndex((player) => player.color === color);
  const player = game.players[index];
  const opponent = game.players[(index + 1) % 4];
  // Place an opponent on the old, incorrect extra track cell.
  opponent.tokens[0] = (STARTS[color] + 51 - STARTS[opponent.color] + 52) % 52;
  const opponentPosition = opponent.tokens[0];
  player.tokens[0] = 50;
  game.currentPlayer = index;
  game.diceValue = 1;
  game.diceRolled = true;
  const result = moveToken(game, color, 0);
  assert.equal(result.nextPosition, 51);
  assert.deepEqual(positionForToken(color, result.nextPosition, 0), firstLaneCells[color]);
  assert.equal(result.captured.length, 0);
  assert.equal(opponent.tokens[0], opponentPosition);

  game.currentPlayer = index;
  player.tokens[0] = 55;
  assert.equal(canMoveToken(game, color, 0, 2), false, 'home requires an exact roll');
  game.diceValue = 1;
  game.diceRolled = true;
  moveToken(game, color, 0);
  assert.equal(player.tokens[0], 56, 'the token finishes one step sooner');
  assert.deepEqual(positionForToken(color, player.tokens[0], 0), finishCells[color]);
}

function gameWithTokenAt(position, otherPositions = [-1, -1, -1]) {
  const game = createGame(`FINISH-${position}-${Math.random()}`, 2);
  addPlayer(game, { userId: 'finish-player' });
  addPlayer(game, { userId: 'finish-opponent' });
  startGame(game, 'finish-player');
  game.players[0].tokens = [position, ...otherPositions];
  game.diceRolled = true;
  return game;
}

const finishCases = [
  [1, 1, 56], [1, 2, null], [1, 3, null], [1, 4, null], [1, 5, null], [1, 6, null],
  [2, 1, 55], [2, 2, 56], [2, 3, null], [2, 4, null], [2, 5, null], [2, 6, null],
  [3, 1, 54], [3, 2, 55], [3, 3, 56], [3, 4, null], [3, 5, null], [3, 6, null],
  [4, 1, 53], [4, 2, 54], [4, 3, 55], [4, 4, 56], [4, 5, null], [4, 6, null],
  [5, 1, 52], [5, 2, 53], [5, 3, 54], [5, 4, 55], [5, 5, 56], [5, 6, null],
  [6, 1, 51], [6, 2, 52], [6, 3, 53], [6, 4, 54], [6, 5, 55], [6, 6, 56],
];

for (const [distance, dice, expected] of finishCases) {
  const position = 56 - distance;
  const game = gameWithTokenAt(position);
  game.diceValue = dice;
  assert.equal(canMoveToken(game, 'finish-player', 0), expected !== null,
    `distance ${distance}, dice ${dice} has expected move availability`);
  if (expected === null) {
    assert.equal(getValidMoves(game, 'finish-player').includes(0), false);
    const stateBeforeRejectedMove = structuredClone(game);
    assert.throws(() => moveToken(game, 'finish-player', 0), /cannot move/);
    assert.deepEqual(game, stateBeforeRejectedMove,
      `distance ${distance}, dice ${dice} rejects without changing any game state`);
  } else {
    assert.equal(getValidMoves(game, 'finish-player').includes(0), true);
    const result = moveToken(game, 'finish-player', 0);
    assert.equal(result.nextPosition, expected);
    assert.equal(game.players[0].tokens[0], expected);
  }
}

const finishedGame = gameWithTokenAt(56);
finishedGame.diceValue = 6;
assert.equal(canMoveToken(finishedGame, 'finish-player', 0), false, 'finished tokens cannot move again');
assert.equal(getValidMoves(finishedGame, 'finish-player').includes(0), false);
const invalidPositionGame = gameWithTokenAt(57);
invalidPositionGame.diceValue = 1;
assert.equal(canMoveToken(invalidPositionGame, 'finish-player', 0), false, 'corrupt positions beyond home cannot move');
assert.throws(() => moveToken(invalidPositionGame, 'finish-player', 0), /cannot move/);

const alternateGame = gameWithTokenAt(54, [55, -1, -1]);
alternateGame.diceValue = 1;
assert.deepEqual(getValidMoves(alternateGame, 'finish-player'), [0, 1],
  'multiple tokens with legal home-stretch moves are independently selectable');
const alternateSelection = moveToken(alternateGame, 'finish-player', 1);
assert.equal(alternateSelection.nextPosition, 56, 'the player can select the other eligible token');

assert.equal(getAutomaticMove([2]), 2, 'one legal token is selected automatically');
assert.equal(getAutomaticMove([0, 2]), null, 'multiple legal tokens require player selection');
assert.equal(getAutomaticMove([]), null, 'no legal token leaves existing pass handling in charge');

const scoredGame = gameWithTokenAt(10);
scoredGame.diceValue = 4;
const scoredMove = moveToken(scoredGame, 'finish-player', 0);
assert.equal(scoredMove.scoreAwarded, 4, 'a four-cell move awards four points');
assert.equal(scoredGame.players[0].score, 4);
assert.equal(scoredGame.players[0].tokenScores[0], 4, 'movement points are tracked for each token');
assert.equal(serializeGame(scoredGame).players[0].score, 4, 'movement score is part of the synchronized public state');
const scoreAfterMove = scoredGame.players[0].score;
assert.throws(() => moveToken(scoredGame, 'finish-player', 0), /Roll the dice first/);
assert.equal(scoredGame.players[0].score, scoreAfterMove, 'a duplicate movement event cannot score twice');

const launchScoreGame = gameWithTokenAt(-1);
launchScoreGame.diceValue = 6;
const launchMove = moveToken(launchScoreGame, 'finish-player', 0);
assert.equal(launchMove.scoreAwarded, 0, 'yard entry does not count as ordinary movement');
assert.equal(launchScoreGame.players[0].score, 0);

const homeScoreGame = gameWithTokenAt(54);
homeScoreGame.diceValue = 2;
const homeScoreMove = moveToken(homeScoreGame, 'finish-player', 0);
assert.equal(homeScoreMove.nextPosition, 56, 'exact finish remains legal');
assert.equal(homeScoreMove.scoreAwarded, 2, 'both home stretch cells count toward score');
assert.equal(homeScoreGame.players[0].score, 2);

const overshootScoreGame = gameWithTokenAt(55);
overshootScoreGame.diceValue = 2;
assert.equal(canMoveToken(overshootScoreGame, 'finish-player', 0), false);
assert.equal(overshootScoreGame.players[0].score, 0, 'overshoots award no points');

const resetScoreGame = createGame('RESET-SCORE', 2);
addPlayer(resetScoreGame, { userId: 'finish-player' });
addPlayer(resetScoreGame, { userId: 'finish-opponent' });
resetScoreGame.players[0].score = 99;
startGame(resetScoreGame, 'finish-player');
assert.equal(resetScoreGame.players[0].score, 0, 'starting a new game resets player scores');

const overshootChoiceGame = gameWithTokenAt(53, [55, -1, -1]);
overshootChoiceGame.diceValue = 3;
assert.deepEqual(getValidMoves(overshootChoiceGame, 'finish-player'), [0],
  'a token with an overshoot is excluded while another token remains eligible');
const alternateMove = moveToken(overshootChoiceGame, 'finish-player', 0);
assert.equal(alternateMove.nextPosition, 56);
assert.equal(overshootChoiceGame.players[0].tokens[1], 55, 'the ineligible token remains in place');

function captureGame(victimPoints = 5, otherTokenPoints = 0) {
  const game = createGame(`CAPTURE-${victimPoints}-${otherTokenPoints}-${Math.random()}`, 2);
  addPlayer(game, { userId: 'attacker' });
  addPlayer(game, { userId: 'victim' });
  startGame(game, 'attacker');
  const attacker = game.players[0];
  const victim = game.players[1];
  attacker.tokens[0] = 6;
  victim.tokens[0] = 33; // Blue's global cell 20, which green reaches from 6.
  victim.tokens[1] = 10;
  victim.tokenScores[0] = victimPoints;
  victim.tokenScores[1] = otherTokenPoints;
  victim.score = victimPoints + otherTokenPoints;
  game.diceValue = 1;
  game.diceRolled = true;
  return game;
}

const captureFiveGame = captureGame(5);
const capturedFive = moveToken(captureFiveGame, 'attacker', 0);
assert.equal(capturedFive.captured.length, 1);
assert.equal(capturedFive.captured[0].movementPoints, 5, 'capture reports the captured token value');
assert.equal(captureFiveGame.players[1].score, 0, 'capturing a five-point token deducts exactly five');
assert.equal(captureFiveGame.players[1].tokenScores[0], 0, 'captured token value resets to zero');
assert.equal(captureFiveGame.players[1].tokens[0], -1, 'captured token returns to its starting yard');
assert.equal(captureFiveGame.players[0].score, 1, 'the capture adds only movement points, no capture bonus');
assert.throws(() => moveToken(captureFiveGame, 'attacker', 0), /Roll the dice first/);
assert.equal(captureFiveGame.players[1].score, 0, 'a duplicate move cannot apply a second capture deduction');

const zeroPointCaptureGame = captureGame(0);
moveToken(zeroPointCaptureGame, 'attacker', 0);
assert.equal(zeroPointCaptureGame.players[1].score, 0, 'capturing a zero-point token never makes score negative');
assert.equal(zeroPointCaptureGame.players[1].tokenScores[0], 0);

const independentTokenScoreGame = captureGame(5, 8);
moveToken(independentTokenScoreGame, 'attacker', 0);
assert.equal(independentTokenScoreGame.players[1].score, 8, 'capturing one token preserves the other token score');
assert.deepEqual(independentTokenScoreGame.players[1].tokenScores, [0, 8, 0, 0]);
const sharedCaptureState = serializeGame(independentTokenScoreGame);
assert.equal(sharedCaptureState.players[1].score, 8);
assert.deepEqual(sharedCaptureState.players[1].tokenScores, [0, 8, 0, 0],
  'the authoritative serialized state synchronizes both total and per-token scores');

const recapturedTokenGame = captureGame(5);
moveToken(recapturedTokenGame, 'attacker', 0);
recapturedTokenGame.currentPlayer = 1;
recapturedTokenGame.diceValue = 6;
recapturedTokenGame.diceRolled = true;
moveToken(recapturedTokenGame, 'victim', 0);
assert.equal(recapturedTokenGame.players[1].tokenScores[0], 0, 'yard entry starts the recaptured token at zero');
recapturedTokenGame.diceValue = 2;
recapturedTokenGame.diceRolled = true;
moveToken(recapturedTokenGame, 'victim', 0);
assert.equal(recapturedTokenGame.players[1].tokenScores[0], 2, 'new movement accumulates from zero after re-entry');
assert.equal(recapturedTokenGame.players[1].score, 2, 'the token rebuilds its score independently after re-entry');

const finishedTokenScoreGame = gameWithTokenAt(55, [56, 56, 56]);
finishedTokenScoreGame.players[0].tokenScores[0] = 5;
finishedTokenScoreGame.players[0].score = 5;
finishedTokenScoreGame.diceValue = 1;
const finishWithScore = moveToken(finishedTokenScoreGame, 'finish-player', 0);
assert.equal(finishWithScore.nextPosition, 56, 'exact finish remains legal');
assert.equal(finishedTokenScoreGame.players[0].tokenScores[0], 6, 'normal finishing retains the token movement value');
assert.equal(finishedTokenScoreGame.players[0].score, 6, 'normal finishing does not deduct movement points');

const moveModeGame = createGame('MOVE-MODE', 2, 10, 0, { gameMode: 'moves', moveLimit: 20 });
addPlayer(moveModeGame, { userId: 'move-a' });
addPlayer(moveModeGame, { userId: 'move-b' });
startGame(moveModeGame, 'move-a');
moveModeGame.players[0].tokens[0] = 10;
moveModeGame.diceValue = 4;
moveModeGame.diceRolled = true;
const firstCountedMove = moveToken(moveModeGame, 'move-a', 0);
assert.equal(firstCountedMove.completedMoves, 1, 'one completed token movement counts as one match move');
assert.equal(firstCountedMove.remainingMoves, 19);
assert.throws(() => moveToken(moveModeGame, 'move-a', 0), /Roll the dice first/);
assert.equal(moveModeGame.completedMoves, 1, 'a duplicate socket action cannot increment the move count');

while (moveModeGame.completedMoves < moveModeGame.moveLimit) {
  const player = moveModeGame.players[moveModeGame.currentPlayer];
  player.tokens[0] = 51;
  moveModeGame.diceValue = 1;
  moveModeGame.diceRolled = true;
  moveToken(moveModeGame, player.userId, 0);
}
assert.equal(moveModeGame.status, 'finished', 'the selected match move limit ends the game');
assert.equal(moveModeGame.winReason, 'move-limit');
assert.equal(moveModeGame.completedMoves, 20);
assert.equal(moveModeGame.winner.userId, 'move-a', 'limit standings use movement score before board progress');

const fullModeGame = createGame('FULL-MODE', 2, 10, 0, { gameMode: 'full' });
addPlayer(fullModeGame, { userId: 'full-a' });
addPlayer(fullModeGame, { userId: 'full-b' });
startGame(fullModeGame, 'full-a');
fullModeGame.players[0].tokens[0] = 10;
fullModeGame.diceValue = 2;
fullModeGame.diceRolled = true;
moveToken(fullModeGame, 'full-a', 0);
assert.equal(fullModeGame.status, 'playing', 'Full Play does not end on a time or move counter');
assert.equal(fullModeGame.moveLimit, null);
assert.equal(fullModeGame.deadlineAt, null);

const timeLimitGame = createGame('TIME-MODE', 2, 15, 0, { gameMode: 'time' });
addPlayer(timeLimitGame, { userId: 'time-a' });
addPlayer(timeLimitGame, { userId: 'time-b' });
startGame(timeLimitGame, 'time-a');
assert.equal(timeLimitGame.timeMinutes, 15, 'Time mode keeps the selected time value');
timeLimitGame.players[0].score = 8;
assert.equal(finishGameByScore(timeLimitGame, 'time-limit').userId, 'time-a');
assert.equal(timeLimitGame.winReason, 'time-limit');
const tiedTimeGame = createGame('TIME-TIE', 2, 5, 0, { gameMode: 'time' });
addPlayer(tiedTimeGame, { userId: 'tie-a' });
addPlayer(tiedTimeGame, { userId: 'tie-b' });
startGame(tiedTimeGame, 'tie-a');
finishGameByScore(tiedTimeGame, 'time-limit');
assert.equal(tiedTimeGame.draw, true, 'an exact time-limit tie is resolved fairly as a draw');
assert.equal(tiedTimeGame.winner, null);

console.log('Ludo home-lane regression tests passed');
