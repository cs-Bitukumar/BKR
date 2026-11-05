import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import ActiveSession from '../models/activeSessionModel.js';
import '../config/env.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function createSession(userId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const jti = crypto.randomUUID();
  const token = jwt.sign({ id: String(userId), jti }, JWT_SECRET, { expiresIn: '7d' });
  const session = { tokenHash: hashToken(token), expiresAt };
  try {
    const replaced = await ActiveSession.updateOne(
      { user: userId, expiresAt: { $lte: now } },
      { $set: session },
    );
    if (replaced.modifiedCount) return token;
    await ActiveSession.create({ user: userId, ...session });
    return token;
  } catch (error) {
    if (error?.code === 11000) {
      // A competing login may have created an expired record before the TTL
      // monitor removed it. Claim it only if it is still expired.
      const replaced = await ActiveSession.updateOne(
        { user: userId, expiresAt: { $lte: new Date() } },
        { $set: session },
      );
      if (replaced.modifiedCount) return token;
      return null;
    }
    throw error;
  }
}

export async function verifySessionToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (!payload.id || !payload.jti) throw new Error('Invalid token');
  const record = await ActiveSession.findOne({
    user: payload.id,
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!record) throw new Error('Session is no longer active');
  return payload;
}

export async function endSession(userId, token) {
  return ActiveSession.deleteOne({ user: userId, tokenHash: hashToken(token) });
}

