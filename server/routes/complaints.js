import express from 'express';
import rateLimit from 'express-rate-limit';
import { submitComplaint } from '../controllers/complaintController.js';

const router = express.Router();
const complaintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many complaints submitted. Please try again later.' },
});

router.post('/', complaintLimiter, submitComplaint);
export default router;
