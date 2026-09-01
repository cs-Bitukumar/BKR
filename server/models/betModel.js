import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  match: { type: String, required: true },
  amount: { type: Number, required: true },
  selection: { type: String, required: true },
  odds: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'won', 'lost', 'cancelled'], default: 'pending' },
  placedAt: { type: Date, default: Date.now },
});

const Bet = mongoose.model('Bet', betSchema);
export default Bet;
