import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'bet', 'payout', 'adjustment'], required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed', 'cancelled'], default: 'success' },
  method: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('WalletTransaction', walletTransactionSchema);
