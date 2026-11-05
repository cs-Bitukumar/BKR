import express from 'express';
import { claimDailyBonus, getWalletController } from '../controllers/walletController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);
router.get('/', getWalletController);
router.post('/rewards/daily', claimDailyBonus);
export default router;
