import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import WalletTransaction from '../models/walletTransactionModel.js';

export async function listUsers(req, res) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(500);
    res.json(users);
  } catch (error) { res.status(500).json({ message: error.message || 'Unable to load users' }); }
}

export async function updateUser(req, res) {
  try {
    const updates = {};
    if (typeof req.body.role === 'string' && ['user', 'admin'].includes(req.body.role)) updates.role = req.body.role;
    if (typeof req.body.username === 'string' && req.body.username.trim().length >= 3) updates.username = req.body.username.trim();
    if (!Object.keys(updates).length) return res.status(400).json({ message: 'No valid updates provided' });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) { res.status(500).json({ message: error.message || 'Unable to update user' }); }
}

export async function listPendingWithdrawals(req, res) {
  try { res.json(await WalletTransaction.find({ type: 'withdrawal', status: 'pending' }).populate('user', 'username email').sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: error.message || 'Unable to load withdrawals' }); }
}

export async function reviewWithdrawal(req, res) {
  try {
    const status = req.body.status;
    if (!['success', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid withdrawal status' });
    const transaction = await WalletTransaction.findOne({ _id: req.params.id, type: 'withdrawal', status: 'pending' });
    if (!transaction) return res.status(404).json({ message: 'Pending withdrawal not found' });
    transaction.status = status;
    await transaction.save();
    if (status === 'cancelled') await User.findByIdAndUpdate(transaction.user, { $inc: { balance: Math.abs(transaction.amount) } });
    res.json(transaction);
  } catch (error) { res.status(500).json({ message: error.message || 'Unable to review withdrawal' }); }
}

export async function adminOverview(req, res) {
  try {
    const [users, bets, pendingWithdrawals] = await Promise.all([
      User.countDocuments(),
      Bet.countDocuments(),
      WalletTransaction.countDocuments({ type: 'withdrawal', status: 'pending' }),
    ]);
    res.json({ users, bets, pendingWithdrawals, uptime: process.uptime() });
  } catch (error) { res.status(500).json({ message: error.message || 'Unable to load overview' }); }
}
