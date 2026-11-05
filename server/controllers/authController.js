import User from '../models/userModel.js';
import { createSession, endSession } from '../auth/session.js';
import { getVirtualCoinBalance } from '../services/walletService.js';
import '../config/env.js';

const gmailRe = /^[^\s@]+@gmail\.com$/i;
const SESSION_CONFLICT = 'This account is already logged in on another device. Please log out from that device before logging in here.';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildPublicUser(user, virtualCoins = 0) {
  return {
    id: user._id,
    email: user.email,
    username: user.username,
    role: user.role,
    virtualCoins,
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
    const token = await createSession(user._id);
    if (!token) return res.status(409).json({ message: SESSION_CONFLICT });
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

    const token = await createSession(user._id);
    if (!token) return res.status(409).json({ message: SESSION_CONFLICT });
    res.json({ token, user: buildPublicUser(user, await getVirtualCoinBalance(user._id)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function logout(req, res) {
  try {
    await endSession(req.user.id, req.authToken);
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select('username email role phone profileImage createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: buildPublicUser(user, await getVirtualCoinBalance(user._id)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
