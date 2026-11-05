import Bet from '../models/betModel.js';

// Legacy /api/bets path now stores a free prediction only. Any supplied amount
// is intentionally ignored and no wallet operation is performed.
export async function placeBet(req, res) {
  try {
    const { matchId, matchTitle, selection } = req.body;
    const odds = Number(req.body.odds);
    if (!matchId || !selection || !Number.isFinite(odds) || odds <= 0 || odds > 1000) {
      return res.status(400).json({ message: 'Choose a valid match prediction.' });
    }
    const bet = await Bet.create({
      user: req.user.id,
      match: String(matchTitle || matchId).slice(0, 180),
      selection: String(selection).slice(0, 180),
      odds,
      mode: 'free_prediction',
    });
    res.status(201).json({ bet, mode: 'free_prediction' });
  } catch {
    console.error('Free prediction could not be saved.');
    res.status(500).json({ message: 'Unable to save prediction.' });
  }
}

export async function listBets(req, res) {
  try {
    const bets = await Bet.find({ user: req.user.id }).select('match selection odds status placedAt mode').sort({ placedAt: -1 });
    res.json(bets);
  } catch {
    console.error('Free prediction history could not be loaded.');
    res.status(500).json({ message: 'Unable to load prediction history.' });
  }
}
