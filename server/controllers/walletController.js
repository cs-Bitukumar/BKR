import User from '../models/userModel.js';
import WalletTransaction from '../models/walletTransactionModel.js';

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    balance: user.balance,
    createdAt: user.createdAt,
  };
}

export async function getWallet(req, res) {
  try {
    const user = await User.findById(req.user.id).select('username email role balance createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const transactions = await WalletTransaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ balance: user.balance, user: publicUser(user), transactions });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to load wallet' });
  }
}

export async function deposit(req, res) {
  try {
    const amount = Number(req.body.amount);
    const method = String(req.body.method || 'manual').trim();
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Invalid deposit amount' });
    const user = await User.findByIdAndUpdate(req.user.id, { $inc: { balance: amount } }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const transaction = await WalletTransaction.create({ user: user._id, type: 'deposit', title: `${method} deposit`, amount, method, status: 'success' });
    res.status(201).json({ user: publicUser(user), transaction });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to deposit funds' });
  }
}

export async function withdraw(req, res) {
  try {
    const amount = Number(req.body.amount);
    const method = String(req.body.method || 'manual').trim();
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Invalid withdrawal amount' });
    const user = await User.findOneAndUpdate({ _id: req.user.id, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { new: true });
    if (!user) return res.status(400).json({ message: 'Insufficient balance or user not found' });
    const transaction = await WalletTransaction.create({ user: user._id, type: 'withdrawal', title: `${method} withdrawal`, amount: -amount, method, status: 'pending' });
    res.status(201).json({ user: publicUser(user), transaction });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to withdraw funds' });
  }
}
