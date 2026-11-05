import mongoose from 'mongoose';

const walletAccountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  virtualCoins: { type: Number, required: true, default: 0, min: 0 },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

export default mongoose.model('WalletAccount', walletAccountSchema);
