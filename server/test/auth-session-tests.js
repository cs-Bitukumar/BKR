import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import ActiveSession from '../models/activeSessionModel.js';
import { createSession, endSession, verifySessionToken, JWT_SECRET } from '../auth/session.js';

const original = {
  create: ActiveSession.create,
  updateOne: ActiveSession.updateOne,
  findOne: ActiveSession.findOne,
  deleteOne: ActiveSession.deleteOne,
};
const records = new Map();
ActiveSession.updateOne = async (filter, update) => {
  const record = records.get(String(filter.user));
  if (record && record.expiresAt <= filter.expiresAt.$lte) {
    Object.assign(record, update.$set);
    return { modifiedCount: 1 };
  }
  return { modifiedCount: 0 };
};
ActiveSession.create = async (record) => {
  const key = String(record.user);
  if (records.has(key)) throw Object.assign(new Error('duplicate'), { code: 11000 });
  records.set(key, { ...record });
};
ActiveSession.findOne = (filter) => ({
  lean: async () => {
    const record = records.get(String(filter.user));
    if (!record || record.tokenHash !== filter.tokenHash || record.expiresAt <= filter.expiresAt.$gt) return null;
    return record;
  },
});
ActiveSession.deleteOne = async (filter) => {
  const key = String(filter.user);
  const record = records.get(key);
  if (!record) return { deletedCount: 0 };
  if (filter.tokenHash && record.tokenHash !== filter.tokenHash) return { deletedCount: 0 };
  if (filter.expiresAt && record.expiresAt <= filter.expiresAt.$gt) return { deletedCount: 0 };
  records.delete(key);
  return { deletedCount: 1 };
};

try {
  // 1. First device obtains the only active session; 2. a second is rejected.
  const deviceA = await createSession('account-a');
  assert.ok(deviceA);
  const deviceB = await createSession('account-a');
  assert.equal(deviceB, null);
  // 3. A rejected attempt leaves A valid.
  assert.equal((await verifySessionToken(deviceA)).id, 'account-a');
  // 4. Owner logout releases the account.
  assert.equal((await endSession('account-a', deviceA)).deletedCount, 1);
  const afterLogout = await createSession('account-a');
  assert.ok(afterLogout);
  // 5. Another account can be active independently.
  assert.ok(await createSession('account-b'));
  // 6. An expired record does not block another login (even before TTL cleanup).
  records.get('account-c');
  records.set('account-c', { user: 'account-c', tokenHash: 'expired', expiresAt: new Date(Date.now() - 1000) });
  assert.ok(await createSession('account-c'));
  // 7. Concurrent logins have one winner.
  const concurrent = await Promise.all(Array.from({ length: 12 }, () => createSession('account-race')));
  assert.equal(concurrent.filter(Boolean).length, 1);
  // 8. Stale/unrelated token cannot delete the current device session.
  assert.equal((await endSession('account-a', deviceA)).deletedCount, 0);
  assert.equal((await verifySessionToken(afterLogout)).id, 'account-a');
  // 9. A refresh keeps using the existing token; it does not create another.
  assert.equal((await verifySessionToken(afterLogout)).id, 'account-a');
  assert.equal(await createSession('account-a'), null);
  // 10. Invalid, revoked, and expired JWTs fail protected-route validation.
  const expired = jwt.sign({ id: 'account-z', jti: 'expired' }, JWT_SECRET, { expiresIn: -1 });
  await assert.rejects(verifySessionToken(expired));
  await assert.rejects(verifySessionToken(jwt.sign({ id: 'account-z', jti: 'missing' }, JWT_SECRET)));
  console.log('Auth session tests passed');
} finally {
  ActiveSession.create = original.create;
  ActiveSession.updateOne = original.updateOne;
  ActiveSession.findOne = original.findOne;
  ActiveSession.deleteOne = original.deleteOne;
}
