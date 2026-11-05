import User from '../models/userModel.js';
import Bet from '../models/betModel.js';
import WalletAccount from '../models/walletAccountModel.js';

export async function listUsers(req, res) {
  try {
    const users = await User.find().select('-password -balance').sort({ createdAt: -1 }).limit(500).lean();
    const accounts = await WalletAccount.find({ user: { $in: users.map((user) => user._id) } }).select('user virtualCoins').lean();
    const coinsByUser = new Map(accounts.map((account) => [String(account.user), account.virtualCoins]));
    for (const user of users) user.virtualCoins = coinsByUser.get(String(user._id)) || 0;
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

export async function adminOverview(req, res) {
  try {
    const [users, bets, walletAccounts] = await Promise.all([
      User.countDocuments(),
      Bet.countDocuments(),
      WalletAccount.countDocuments(),
    ]);
    res.json({ users, bets, walletAccounts, uptime: process.uptime() });
  } catch (error) { res.status(500).json({ message: error.message || 'Unable to load overview' }); }
}
