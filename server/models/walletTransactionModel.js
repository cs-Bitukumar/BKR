import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transactionId: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, required: true },
  type: { type: String, enum: ['reward', 'daily_bonus', 'game_use', 'adjustment'], required: true },
  description: { type: String, required: true, maxlength: 180 },
  amount: { type: Number, required: true },
  rewardDate: { type: String },
  rewardDay: { type: Number, min: 1, max: 7 },
  consecutiveStreak: { type: Number, min: 1 },
  virtualCoinsBefore: { type: Number, required: true, min: 0 },
  virtualCoinsAfter: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

walletTransactionSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
walletTransactionSchema.index(
  { user: 1, rewardDate: 1 },
  { unique: true, partialFilterExpression: { rewardDate: { $type: 'string' } } },
);

export default mongoose.model('WalletTransaction', walletTransactionSchema);
