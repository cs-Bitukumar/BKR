import assert from 'node:assert/strict';
import './ludo-path-tests.js';
import './spinner-tests.js';
import './auth-session-tests.js';
import './complaint-tests.js';
import './wallet-service-tests.js';
import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import WalletAccount from '../models/walletAccountModel.js';
import WalletTransaction from '../models/walletTransactionModel.js';
import { createGame, addPlayer, normalizeStake, calculatePot } from '../ludo/gameEngine.js';
import { createSpinnerGame, normalizeStake as normalizeSpinnerStake, calculateSpinnerPot } from '../spinner/gameEngine.js';

const user = new User({ username: 'tester', email: 'tester@gmail.com', password: 'password123' });
assert.equal(user.role, 'user');
assert.equal(user.balance, undefined, 'users no longer have a monetary balance field');
assert.equal(user.validateSync(), undefined);
assert.ok(new Bet({}).validateSync().errors.user);
assert.ok(new WalletAccount({}).validateSync().errors.user);
assert.ok(new WalletTransaction({}).validateSync().errors.user);
assert.ok(WalletTransaction.schema.indexes().some(([keys, options]) => (
  keys.user === 1 && keys.rewardDate === 1 && options.unique && options.partialFilterExpression
)), 'daily reward dates have a unique per-user ledger index');

assert.equal(normalizeStake(10), 0);
const ludo = createGame('FREE01', 2, 10, 100);
addPlayer(ludo, { userId: 'host' });
assert.equal(ludo.stake, 0);
assert.equal(calculatePot(ludo), 0);
assert.equal(normalizeSpinnerStake(10), 0);
assert.equal(createSpinnerGame('FREE02', 2, 5, 100).stake, 0);
assert.equal(calculateSpinnerPot({ stake: 100, players: [{}, {}] }), 0);

console.log('Server model and free-play tests passed');
