import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  startTime: { type: Date, required: true },
  status: { type: String, enum: ['upcoming', 'live', 'finished'], default: 'upcoming' },
  odds: {
    home: { type: Number, default: 1.0 },
    away: { type: Number, default: 1.0 },
    draw: { type: Number, default: 1.0 },
  },
  score: {
    home: { type: Number, default: 0 },
    away: { type: Number, default: 0 },
  },
});

const Match = mongoose.model('Match', matchSchema);
export default Match;
