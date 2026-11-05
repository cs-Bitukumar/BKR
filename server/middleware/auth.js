import { verifySessionToken } from '../auth/session.js';

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  const token = auth.split(' ')[1];
  try {
    const payload = await verifySessionToken(token);
    req.user = { id: payload.id };
    req.authToken = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
