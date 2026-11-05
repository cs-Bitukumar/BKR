import crypto from 'node:crypto';
import mongoose from 'mongoose';
import WalletAccount from '../models/walletAccountModel.js';
import WalletTransaction from '../models/walletTransactionModel.js';

const TYPES = new Set(['reward', 'daily_bonus', 'game_use', 'adjustment']);
export const DAILY_REWARD_SCHEDULE = [100, 150, 200, 250, 300, 400, 500];
const INDIA_TIME_ZONE = 'Asia/Kolkata';
const INDIA_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: INDIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const publicTransaction = (transaction) => ({
  transactionId: transaction.transactionId,
  type: transaction.type,
  description: transaction.description,
  amount: transaction.amount,
  virtualCoinsBefore: transaction.virtualCoinsBefore,
  virtualCoinsAfter: transaction.virtualCoinsAfter,
  rewardDate: transaction.rewardDate,
  rewardDay: transaction.rewardDay,
  consecutiveStreak: transaction.consecutiveStreak,
  createdAt: transaction.createdAt,
});

function getIndiaCalendarDate(date) {
  const parts = INDIA_DATE_FORMATTER.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftCalendarDate(date, offset) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
}

function getTransactionRewardDate(transaction) {
  return transaction.rewardDate || getIndiaCalendarDate(new Date(transaction.createdAt));
}

function getTransactionRewardDay(transaction, recentRewards = [transaction]) {
  if (Number.isInteger(transaction.rewardDay) && transaction.rewardDay >= 1 && transaction.rewardDay <= 7) {
    return transaction.rewardDay;
  }
  const day = DAILY_REWARD_SCHEDULE.indexOf(Number(transaction.amount)) + 1;
  if (Number(transaction.amount) === DAILY_REWARD_SCHEDULE[0]) {
    return ((getTransactionStreak(transaction, recentRewards) - 1) % DAILY_REWARD_SCHEDULE.length) + 1;
  }
  return day || 1;
}

function getTransactionStreak(transaction, recentRewards) {
  if (Number.isInteger(transaction?.consecutiveStreak) && transaction.consecutiveStreak > 0) {
    return transaction.consecutiveStreak;
  }
  if (!transaction) return 0;
  let expectedDate = getTransactionRewardDate(transaction);
  let streak = 0;
  const orderedRewards = [
    transaction,
    ...recentRewards.filter((reward) => reward.transactionId !== transaction.transactionId),
  ];
  for (const reward of orderedRewards) {
    const rewardDate = getTransactionRewardDate(reward);
    if (rewardDate !== expectedDate) break;
    if (Number.isInteger(reward.consecutiveStreak) && reward.consecutiveStreak > 0) {
      return streak + reward.consecutiveStreak;
    }
    streak += 1;
    expectedDate = shiftCalendarDate(expectedDate, -1);
  }
  return streak;
}

async function getRecentDailyRewards(userId, session) {
  let query = WalletTransaction.find({ user: userId, type: 'daily_bonus' })
    .sort({ createdAt: -1 })
    .limit(8);
  if (session) query = query.session(session);
  return query.lean();
}

function nextRewardDay(day) {
  return (day % DAILY_REWARD_SCHEDULE.length) + 1;
}

export async function getDailyRewardStatus(userId, now = new Date()) {
  const today = getIndiaCalendarDate(now);
  const yesterday = shiftCalendarDate(today, -1);
  const [latestReward, ...recentRewards] = await getRecentDailyRewards(userId);
  const todayReward = [latestReward, ...recentRewards]
    .find((transaction) => getTransactionRewardDate(transaction) === today);
  const lastRewardDate = latestReward ? getTransactionRewardDate(latestReward) : null;
  const claimedToday = Boolean(todayReward);
  const consecutive = !claimedToday && lastRewardDate === yesterday;
  const recentIncludingLatest = [latestReward, ...recentRewards].filter(Boolean);
  const currentDay = claimedToday
    ? getTransactionRewardDay(todayReward, recentIncludingLatest)
    : consecutive
      ? nextRewardDay(getTransactionRewardDay(latestReward, recentIncludingLatest))
      : 1;
  const currentStreak = claimedToday
    ? getTransactionStreak(todayReward, [latestReward, ...recentRewards].filter(Boolean))
    : consecutive
      ? getTransactionStreak(latestReward, recentIncludingLatest)
      : 0;
  const claimedThrough = claimedToday
    ? currentDay
    : consecutive && currentDay !== 1
      ? getTransactionRewardDay(latestReward, recentIncludingLatest)
      : 0;

  return {
    timeZone: INDIA_TIME_ZONE,
    today,
    claimedToday,
    currentStreak,
    rewardDay: currentDay,
    todayRewardCoins: claimedToday ? Number(todayReward.amount) : DAILY_REWARD_SCHEDULE[currentDay - 1],
    nextRewardDay: nextRewardDay(currentDay),
    nextRewardCoins: DAILY_REWARD_SCHEDULE[nextRewardDay(currentDay) - 1],
    claimedDays: Array.from({ length: claimedThrough }, (_, index) => index + 1),
    schedule: DAILY_REWARD_SCHEDULE.map((coins, index) => ({ day: index + 1, coins })),
    lastClaimedAt: latestReward?.createdAt || null,
  };
}

export async function getWallet(userId) {
  const [account, transactions, dailyReward] = await Promise.all([
    WalletAccount.findOne({ user: userId }).lean(),
    WalletTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean(),
    getDailyRewardStatus(userId),
  ]);
  return {
    virtualCoins: Number(account?.virtualCoins) || 0,
    transactions: transactions.map(publicTransaction),
    dailyReward,
  };
}

export async function getVirtualCoinBalance(userId) {
  const account = await WalletAccount.findOne({ user: userId }).select('virtualCoins').lean();
  return Number(account?.virtualCoins) || 0;
}

/**
 * Adds/removes non-transferable virtual coins. The account and ledger entry
 * commit in one MongoDB transaction. Callers provide server-generated,
 * operation-specific idempotency keys; there is deliberately no transfer API.
 */
export async function applyCoinChange({ userId, amount, type, description, idempotencyKey }) {
  const delta = Number(amount);
  const key = String(idempotencyKey || '').trim();
  const label = String(description || '').trim();
  if (!Number.isSafeInteger(delta) || delta === 0) throw new Error('Coin amount must be a non-zero integer.');
  if (!TYPES.has(type)) throw new Error('Unsupported virtual coin transaction type.');
  if (type === 'game_use' && delta > 0) throw new Error('Game use can only spend virtual coins.');
  if (type !== 'game_use' && delta < 0 && type !== 'adjustment') throw new Error('This transaction type cannot debit coins.');
  if (!key || key.length > 160) throw new Error('A valid idempotency key is required.');
  if (!label || label.length > 180) throw new Error('A valid transaction description is required.');

  let result;
  try {
    await mongoose.connection.transaction(async (session) => {
      await WalletAccount.updateOne({ user: userId }, { $setOnInsert: { virtualCoins: 0, updatedAt: new Date() } }, { upsert: true, session });
      const filter = delta < 0 ? { user: userId, virtualCoins: { $gte: Math.abs(delta) } } : { user: userId };
      const account = await WalletAccount.findOneAndUpdate(filter, { $inc: { virtualCoins: delta }, $set: { updatedAt: new Date() } }, { new: true, session });
      if (!account) throw new Error('Insufficient virtual coins.');
      const coinsAfter = Number(account.virtualCoins);
      const transaction = {
        user: userId,
        transactionId: crypto.randomUUID(),
        idempotencyKey: key,
        type,
        description: label,
        amount: delta,
        virtualCoinsBefore: coinsAfter - delta,
        virtualCoinsAfter: coinsAfter,
      };
      await WalletTransaction.create([transaction], { session });
      result = { virtualCoins: coinsAfter, transaction: publicTransaction({ ...transaction, createdAt: new Date() }), duplicate: false };
    });
    return result;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existing = await WalletTransaction.findOne({ user: userId, idempotencyKey: key }).lean();
    if (!existing) throw error;
    const account = await WalletAccount.findOne({ user: userId }).lean();
    return { virtualCoins: Number(account?.virtualCoins) || 0, transaction: publicTransaction(existing), duplicate: true };
  }
}

export async function grantDailyBonus(userId, now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('A valid claim timestamp is required.');
  }
  const rewardDate = getIndiaCalendarDate(now);
  let result;

  try {
    await mongoose.connection.transaction(async (session) => {
      await WalletAccount.updateOne(
        { user: userId },
        { $setOnInsert: { virtualCoins: 0, updatedAt: new Date() } },
        { upsert: true, session },
      );

      const recentRewards = await getRecentDailyRewards(userId, session);
      const existingReward = recentRewards.find(
        (transaction) => getTransactionRewardDate(transaction) === rewardDate,
      );
      if (existingReward) {
        const account = await WalletAccount.findOne({ user: userId }).session(session).lean();
        result = {
          virtualCoins: Number(account?.virtualCoins) || 0,
          transaction: publicTransaction(existingReward),
          duplicate: true,
        };
        return;
      }

      const latestReward = recentRewards[0];
      const isConsecutive = latestReward
        && getTransactionRewardDate(latestReward) === shiftCalendarDate(rewardDate, -1);
      const rewardDay = isConsecutive
        ? nextRewardDay(getTransactionRewardDay(latestReward, recentRewards))
        : 1;
      const consecutiveStreak = isConsecutive
        ? getTransactionStreak(latestReward, recentRewards) + 1
        : 1;
      const amount = DAILY_REWARD_SCHEDULE[rewardDay - 1];
      const account = await WalletAccount.findOneAndUpdate(
        { user: userId },
        { $inc: { virtualCoins: amount }, $set: { updatedAt: now } },
        { new: true, session },
      );
      if (!account) throw new Error('Unable to update virtual coin balance.');

      const transaction = {
        user: userId,
        transactionId: crypto.randomUUID(),
        idempotencyKey: `daily-bonus:${rewardDate}`,
        type: 'daily_bonus',
        description: `Daily login reward - Day ${rewardDay}`,
        amount,
        rewardDate,
        rewardDay,
        consecutiveStreak,
        virtualCoinsBefore: Number(account.virtualCoins) - amount,
        virtualCoinsAfter: Number(account.virtualCoins),
        createdAt: now,
      };
      await WalletTransaction.create([transaction], { session });
      result = {
        virtualCoins: Number(account.virtualCoins),
        transaction: publicTransaction(transaction),
        duplicate: false,
      };
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existingReward = await WalletTransaction.findOne({
      user: userId,
      $or: [{ rewardDate }, { idempotencyKey: `daily-bonus:${rewardDate}` }],
    }).lean();
    if (!existingReward) throw error;
    const account = await WalletAccount.findOne({ user: userId }).lean();
    result = {
      virtualCoins: Number(account?.virtualCoins) || 0,
      transaction: publicTransaction(existingReward),
      duplicate: true,
    };
  }

  return { ...result, dailyReward: await getDailyRewardStatus(userId, now) };
}
