import express from 'express';
import { placeBet, listBets } from '../controllers/betController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, placeBet);
router.get('/', requireAuth, listBets);

export default router;
