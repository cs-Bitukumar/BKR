import Bet from '../models/betModel.js';
import User from '../models/userModel.js';
import WalletTransaction from '../models/walletTransactionModel.js';

export async function placeBet(req, res) {
  let debitedUser = null;
  let createdBet = null;
  let betAmount = 0;
  try {
    const { matchId, matchTitle, selection } = req.body;
    const amount = Number(req.body.amount);
    betAmount = amount;
    const odds = Number(req.body.odds);

    if (!matchId || !selection || !Number.isFinite(amount) || !Number.isFinite(odds)) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (amount <= 0 || odds <= 0) {
      return res.status(400).json({ message: 'Invalid bet values' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user.id, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true },
    );
    if (!user) return res.status(400).json({ message: 'Insufficient balance or user not found' });
    debitedUser = user;

    const bet = new Bet({
      user: user._id,
      match: String(matchTitle || matchId),
      amount,
      selection,
      odds,
    });
    await bet.save();
    createdBet = bet;
    await WalletTransaction.create({ user: user._id, type: 'bet', title: `${matchTitle || matchId} · ${selection}`, amount: -amount, status: 'success' });

    res.status(201).json({
      bet,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    if (createdBet?._id) await Bet.findByIdAndDelete(createdBet._id).catch(() => {});
    if (debitedUser?._id) await User.findByIdAndUpdate(debitedUser._id, { $inc: { balance: betAmount } }).catch(() => {});
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function listBets(req, res) {
  try {
    const bets = await Bet.find({ user: req.user.id }).sort({ placedAt: -1 });
    res.json(bets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
