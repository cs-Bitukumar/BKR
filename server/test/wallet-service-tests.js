import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import WalletAccount from '../models/walletAccountModel.js';
import WalletTransaction from '../models/walletTransactionModel.js';
import { applyCoinChange, getDailyRewardStatus, getWallet, grantDailyBonus } from '../services/walletService.js';

const original = {
  transaction: mongoose.connection.transaction,
  accountUpdate: WalletAccount.updateOne,
  accountFindOneAndUpdate: WalletAccount.findOneAndUpdate,
  accountFindOne: WalletAccount.findOne,
  transactionCreate: WalletTransaction.create,
  transactionFindOne: WalletTransaction.findOne,
  transactionFind: WalletTransaction.find,
};
const accounts = new Map();
const ledger = [];
let transactionQueue = Promise.resolve();
mongoose.connection.transaction = (work) => {
  const current = transactionQueue.then(async () => {
    const beforeAccounts = new Map([...accounts].map(([key, value]) => [key, { ...value }]));
    const beforeLedger = ledger.slice();
    try { return await work({ testSession: true }); }
    catch (error) { accounts.clear(); beforeAccounts.forEach((value, key) => accounts.set(key, value)); ledger.splice(0, ledger.length, ...beforeLedger); throw error; }
  });
  transactionQueue = current.catch(() => {});
  return current;
};
WalletAccount.updateOne = async (filter) => {
  const key = String(filter.user);
  if (!accounts.has(key)) accounts.set(key, { user: filter.user, virtualCoins: 0 });
  return { upsertedCount: 1 };
};
WalletAccount.findOneAndUpdate = async (filter, update) => {
  const account = accounts.get(String(filter.user));
  if (filter.virtualCoins && account.virtualCoins < filter.virtualCoins.$gte) return null;
  account.virtualCoins += update.$inc.virtualCoins;
  account.updatedAt = update.$set.updatedAt;
  return { ...account };
};
WalletAccount.findOne = (filter) => {
  const account = accounts.get(String(filter.user));
  return { select() { return this; }, session() { return this; }, lean: async () => account ? { ...account } : null };
};
WalletTransaction.create = async (docs) => {
  for (const doc of docs) {
    if (ledger.some((item) => item.user === doc.user && (
      item.idempotencyKey === doc.idempotencyKey
      || (doc.rewardDate && item.rewardDate === doc.rewardDate)
    ))) {
      throw Object.assign(new Error('duplicate'), { code: 11000 });
    }
    ledger.push({ ...doc, createdAt: doc.createdAt || new Date() });
  }
};
WalletTransaction.findOne = (filter) => ({
  lean: async () => ledger.find((item) => item.user === filter.user && (
    item.idempotencyKey === filter.idempotencyKey
    || item.rewardDate === filter.rewardDate
    || filter.$or?.some((condition) => item.rewardDate === condition.rewardDate || item.idempotencyKey === condition.idempotencyKey)
  )) || null,
});
WalletTransaction.find = (filter) => {
  let maximum = 100;
  return {
    sort() { return this; },
    limit(value) { maximum = value; return this; },
    session() { return this; },
    lean: async () => ledger
      .filter((item) => item.user === filter.user && (!filter.type || item.type === filter.type))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maximum),
  };
};

try {
  const userId = 'virtual-user';
  const firstDay = new Date('2026-11-03T12:00:00+05:30');
  const bonus = await grantDailyBonus(userId, firstDay);
  assert.equal(bonus.virtualCoins, 100);
  const replay = await grantDailyBonus(userId, firstDay);
  assert.equal(replay.duplicate, true, 'daily reward replay is idempotent');
  assert.equal(replay.virtualCoins, 100);
  assert.equal(replay.dailyReward.claimedToday, true);
  assert.equal(replay.dailyReward.rewardDay, 1);
  assert.deepEqual(replay.dailyReward.claimedDays, [1]);

  const streakUser = 'streak-user';
  const scheduledCoins = [100, 150, 200, 250, 300, 400, 500];
  for (let index = 0; index < scheduledCoins.length; index += 1) {
    const date = new Date(Date.UTC(2026, 10, 3 + index, 6, 30));
    const claim = await grantDailyBonus(streakUser, date);
    assert.equal(claim.transaction.rewardDay, index + 1, `consecutive claim ${index + 1} advances the streak`);
    assert.equal(claim.transaction.amount, scheduledCoins[index]);
    assert.equal(claim.transaction.rewardDate, `2026-11-${String(3 + index).padStart(2, '0')}`);
    assert.equal(claim.transaction.createdAt.getTime(), date.getTime(), 'claim timestamp is recorded');
  }
  const cycleBoundary = await getDailyRewardStatus(streakUser, new Date('2026-11-10T12:00:00+05:30'));
  assert.equal(cycleBoundary.rewardDay, 1, 'the next cycle starts with Day 1');
  assert.deepEqual(cycleBoundary.claimedDays, [], 'the completed previous cycle does not mark new-cycle days claimed');
  const cycleRestart = await grantDailyBonus(streakUser, new Date('2026-11-10T12:00:00+05:30'));
  assert.equal(cycleRestart.transaction.rewardDay, 1, 'the cycle restarts after Day 7');
  assert.equal(cycleRestart.transaction.amount, 100);
  assert.equal(cycleRestart.dailyReward.currentStreak, 8, 'the consecutive-day streak continues across reward cycles');
  const missedDayReset = await grantDailyBonus(streakUser, new Date('2026-11-12T12:00:00+05:30'));
  assert.equal(missedDayReset.transaction.rewardDay, 1, 'missing a calendar day resets the streak');

  const timezoneUser = 'india-midnight-user';
  const timezoneClaims = await Promise.all([
    grantDailyBonus(timezoneUser, new Date('2026-11-03T18:45:00.000Z')),
    grantDailyBonus(timezoneUser, new Date('2026-11-04T00:15:00.000Z')),
  ]);
  assert.equal(timezoneClaims.filter((claim) => !claim.duplicate).length, 1, 'UTC timestamps on the same Indian calendar date only earn one reward');
  assert.equal(timezoneClaims[0].transaction.rewardDate, '2026-11-04');
  assert.equal(timezoneClaims[1].transaction.rewardDate, '2026-11-04');

  const legacyUser = 'legacy-reward-user';
  accounts.set(legacyUser, { user: legacyUser, virtualCoins: 200 });
  for (const [day, transactionId] of [[1, 'legacy-day-1'], [2, 'legacy-day-2']]) {
    ledger.push({
      user: legacyUser,
      transactionId,
      idempotencyKey: `daily-bonus:2026-11-0${day}`,
      type: 'daily_bonus',
      description: 'Daily login bonus',
      amount: 100,
      virtualCoinsBefore: (day - 1) * 100,
      virtualCoinsAfter: day * 100,
      createdAt: new Date(`2026-11-0${day}T06:30:00.000Z`),
    });
  }
  const legacyStreak = await grantDailyBonus(legacyUser, new Date('2026-11-03T12:00:00+05:30'));
  assert.equal(legacyStreak.transaction.rewardDay, 3, 'legacy daily bonus history continues its consecutive streak');
  assert.equal(legacyStreak.transaction.amount, 200);

  const concurrentUser = 'concurrent-reward-user';
  const concurrentClaims = await Promise.all(Array.from({ length: 20 }, () => grantDailyBonus(concurrentUser, firstDay)));
  assert.equal(concurrentClaims.filter((claim) => !claim.duplicate).length, 1, 'concurrent claims credit a daily reward once');
  assert.equal(accounts.get(concurrentUser).virtualCoins, 100);
  assert.equal(ledger.filter((item) => item.user === concurrentUser && item.type === 'daily_bonus').length, 1);

  const pendingStatus = await getDailyRewardStatus(streakUser, new Date('2026-11-14T12:00:00+05:30'));
  assert.equal(pendingStatus.claimedToday, false);
  assert.equal(pendingStatus.rewardDay, 1, 'a stale streak shows Day 1 as the next reward');
  assert.equal(pendingStatus.todayRewardCoins, 100);

  await applyCoinChange({ userId, amount: -30, type: 'game_use', description: 'Ludo cosmetic use', idempotencyKey: 'game-use-1' });
  await assert.rejects(applyCoinChange({ userId, amount: -1000, type: 'game_use', description: 'Too much', idempotencyKey: 'game-use-too-much' }), /Insufficient virtual coins/);

  const concurrent = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => applyCoinChange({
    userId, amount: -10, type: 'game_use', description: `Concurrent game use ${index}`, idempotencyKey: `concurrent-game-use-${index}`,
  })));
  assert.equal(concurrent.filter((item) => item.status === 'fulfilled').length, 7, 'concurrent debits cannot spend more coins than the account holds');
  const wallet = await getWallet(userId);
  assert.equal(wallet.virtualCoins, 0, 'balance equals initial reward minus committed usage');
  assert.equal(wallet.transactions.length, 9, 'ledger includes the bonus and all successful spends');
  assert.ok(wallet.transactions.every((tx) => tx.transactionId && tx.createdAt && tx.description && Number.isInteger(tx.amount) && Number.isInteger(tx.virtualCoinsBefore) && Number.isInteger(tx.virtualCoinsAfter)));
  assert.ok(wallet.transactions.every((tx) => tx.virtualCoinsAfter === tx.virtualCoinsBefore + tx.amount), 'every ledger row reconciles its virtual coin change');
  await assert.rejects(applyCoinChange({ userId, amount: 10, type: 'deposit', description: 'prohibited deposit', idempotencyKey: 'cash' }), /Unsupported/);
  await assert.rejects(applyCoinChange({ userId, amount: -1.5, type: 'game_use', description: 'fraction', idempotencyKey: 'fraction' }), /integer/);
  console.log('Virtual wallet service tests passed');
} finally {
  mongoose.connection.transaction = original.transaction;
  WalletAccount.updateOne = original.accountUpdate;
  WalletAccount.findOneAndUpdate = original.accountFindOneAndUpdate;
  WalletAccount.findOne = original.accountFindOne;
  WalletTransaction.create = original.transactionCreate;
  WalletTransaction.findOne = original.transactionFindOne;
  WalletTransaction.find = original.transactionFind;
}
