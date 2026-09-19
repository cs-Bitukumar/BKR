import assert from 'node:assert/strict';
import { addPlayer, canMoveToken, createGame, getGlobalPosition, moveToken, startGame } from '../ludo/gameEngine.js';
import { HOME_LANES, STARTS, TRACK_COORDS, positionForToken } from '../../client/src/pages/ludo/components/boardGeometry.js';

const entryCells = { red: [7, 0], green: [0, 7], yellow: [7, 14], blue: [14, 7] };
const firstLaneCells = { red: [7, 1], green: [1, 7], yellow: [7, 13], blue: [13, 7] };

for (const color of Object.keys(STARTS)) {
  assert.deepEqual(positionForToken(color, 50, 0), entryCells[color]);
  assert.deepEqual(positionForToken(color, 51, 0), firstLaneCells[color]);
  for (let position = 0; position <= 50; position += 1) {
    assert.deepEqual(positionForToken(color, position, 0), TRACK_COORDS[getGlobalPosition(color, position)]);
  }
  for (let position = 51; position <= 56; position += 1) {
    assert.equal(getGlobalPosition(color, position), null, 'home lanes are not shared capture cells');
    assert.deepEqual(positionForToken(color, position, 0), HOME_LANES[color][position - 51]);
  }
  for (let position = 50; position < 57; position += 1) {
    const from = positionForToken(color, position, 0);
    const to = positionForToken(color, position + 1, 0);
    assert.equal(Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]), 1, 'entry and home steps must be adjacent');
  }

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
  player.tokens[0] = 56;
  assert.equal(canMoveToken(game, color, 0, 2), false, 'home requires an exact roll');
  game.diceValue = 1;
  game.diceRolled = true;
  moveToken(game, color, 0);
  assert.deepEqual(positionForToken(color, player.tokens[0], 0), [7, 7]);
}
console.log('Ludo home-lane regression tests passed');
