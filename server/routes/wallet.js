import express from 'express';
import { deposit, getWallet, withdraw } from '../controllers/walletController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);
router.get('/', getWallet);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);
export default router;
