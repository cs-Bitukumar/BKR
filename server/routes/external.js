import express from 'express';
import { liveMatches, liveFootballMatches } from '../controllers/liveController.js';

const router = express.Router();

// Returns live/available cricket and football matches
router.get('/cricket', liveMatches);
router.get('/football', liveFootballMatches);

export default router;
