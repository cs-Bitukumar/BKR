import express from 'express';
import { adminOverview, listUsers, updateUser } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { listComplaints, updateComplaint } from '../controllers/complaintController.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);
router.get('/overview', adminOverview);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.get('/complaints', listComplaints);
router.patch('/complaints/:id', updateComplaint);
export default router;
