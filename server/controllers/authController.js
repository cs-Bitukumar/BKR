import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import '../config/env.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const gmailRe = /^[^\s@]+@gmail\.com$/i;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildPublicUser(user) {
  return {
    id: user._id,
    email: user.email,
    username: user.username,
    role: user.role,
    balance: user.balance,
    phone: user.phone || '',
    profileImage: user.profileImage || '',
    createdAt: user.createdAt,
  };
}

export async function register(req, res) {
  try {
    const username = String(req.body.username || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const phone = String(req.body.phone || '').trim();

    if (!username || !email || !password) return res.status(400).json({ message: 'Missing fields' });
    if (username.length < 3) return res.status(400).json({ message: 'Username must be at least 3 characters' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (phone && !/^\+?[0-9\s()-]{7,20}$/.test(phone)) return res.status(400).json({ message: 'Please use a valid mobile number' });
    if (!gmailRe.test(email)) return res.status(400).json({ message: 'Only Gmail addresses are allowed' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const user = new User({ username, email, password, phone });
    await user.save();
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: buildPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function login(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
    if (!gmailRe.test(email)) return res.status(400).json({ message: 'Only Gmail addresses are allowed' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: buildPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select('username email role balance phone profileImage createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: buildPublicUser(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
