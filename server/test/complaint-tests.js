import assert from 'node:assert/strict';
import express from 'express';
import Complaint from '../models/complaintModel.js';
import complaintRouter from '../routes/complaints.js';
import adminRouter from '../routes/admin.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { submitComplaint, listComplaints, updateComplaint } from '../controllers/complaintController.js';

const original = { create: Complaint.create, find: Complaint.find, findByIdAndUpdate: Complaint.findByIdAndUpdate };
const rows = [];
Complaint.create = async (values) => {
  const row = { ...values, _id: `id-${rows.length + 1}`, createdAt: new Date() };
  rows.push(row);
  return row;
};
Complaint.find = () => ({
  select() { return this; },
  sort() { return this; },
  limit() { return this; },
  lean: async () => rows,
});
Complaint.findByIdAndUpdate = (id, updates) => {
  const row = rows.find((item) => item._id === id);
  if (row) Object.assign(row, updates);
  return { select: async () => row || null };
};

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

try {
  const body = { name: 'Test User', email: 'test@example.com', category: 'game', subject: 'Board froze', details: 'My match froze during an active turn.' };
  const first = response();
  await submitComplaint({ body }, first);
  assert.equal(first.statusCode, 201);
  assert.match(first.payload.referenceId, /^BKR-[A-F0-9]{10}$/);
  assert.equal(JSON.stringify(first.payload).includes(body.email), false, 'receipt returns no submitted private details');
  const second = response();
  await submitComplaint({ body: { ...body, subject: 'Second report' } }, second);
  assert.notEqual(first.payload.referenceId, second.payload.referenceId, 'each successful complaint receives a unique reference');

  const invalid = response();
  await submitComplaint({ body: { ...body, category: 'unknown' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(rows.length, 2, 'invalid complaints are not stored');

  const listed = response();
  await listComplaints({ query: {} }, listed);
  assert.equal(listed.payload.length, 2, 'admins can list the stored cases through the protected admin route');
  const updated = response();
  await updateComplaint({ params: { id: 'id-1' }, body: { status: 'In Progress', internalNotes: '<script>private note</script>', resolutionMessage: 'We are investigating.' } }, updated);
  assert.equal(updated.payload.status, 'In Progress');
  assert.equal(updated.payload.internalNotes, 'private note', 'admin notes are sanitized before storage');
  assert.equal(updated.payload.resolutionMessage, 'We are investigating.');

  const invalidStatus = response();
  await updateComplaint({ params: { id: 'id-1' }, body: { status: 'Published' } }, invalidStatus);
  assert.equal(invalidStatus.statusCode, 400);

  assert.equal(adminRouter.stack[0].handle, requireAuth, 'admin complaint routes require authentication');
  assert.equal(adminRouter.stack[1].handle, requireAdmin, 'admin complaint routes require admin authorization');
  const app = express();
  app.use(express.json());
  app.use('/api/complaints', complaintRouter);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const request = () => fetch(`http://127.0.0.1:${address.port}/api/complaints`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    for (let i = 0; i < 5; i += 1) assert.equal((await request()).status, 201, 'complaint submissions are accepted within the configured limit');
    assert.equal((await request()).status, 429, 'the complaint endpoint rate limits repeat submissions');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('Complaint tests passed');
} finally {
  Complaint.create = original.create;
  Complaint.find = original.find;
  Complaint.findByIdAndUpdate = original.findByIdAndUpdate;
}
