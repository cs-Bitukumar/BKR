import Match from '../models/matchModel.js';

export async function listMatches(req, res) {
  try {
    const matches = await Match.find().sort({ startTime: 1 }).limit(100);
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function createMatch(req, res) {
  try {
    const data = req.body;
    const match = new Match(data);
    await match.save();
    res.status(201).json(match);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
