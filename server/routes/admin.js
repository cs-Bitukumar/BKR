import express from 'express';
import { adminOverview, listPendingWithdrawals, listUsers, reviewWithdrawal, updateUser } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);
router.get('/overview', adminOverview);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.get('/withdrawals', listPendingWithdrawals);
router.patch('/withdrawals/:id', reviewWithdrawal);
export default router;
