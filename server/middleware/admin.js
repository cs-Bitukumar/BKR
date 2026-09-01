import User from '../models/userModel.js';

export async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user?.id).select('role');
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  } catch {
    res.status(500).json({ message: 'Unable to verify admin access' });
  }
}
