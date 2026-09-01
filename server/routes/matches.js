import express from 'express';
import { listMatches, createMatch } from '../controllers/matchController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/', listMatches);
router.post('/', requireAuth, requireAdmin, createMatch);

export default router;
