import crypto from 'node:crypto';
import Complaint from '../models/complaintModel.js';

const categories = new Set(['account', 'wallet', 'game', 'abuse', 'privacy', 'other']);
const cleanText = (value) => String(value || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export async function submitComplaint(req, res) {
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email).toLowerCase();
  const category = String(req.body.category || '').trim();
  const subject = cleanText(req.body.subject);
  const details = cleanText(req.body.details);
  if (!name || name.length > 100) return res.status(400).json({ message: 'Enter a name up to 100 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (!categories.has(category)) return res.status(400).json({ message: 'Choose a valid complaint category.' });
  if (!subject || subject.length > 160) return res.status(400).json({ message: 'Enter a subject up to 160 characters.' });
  if (!details || details.length < 10 || details.length > 5000) return res.status(400).json({ message: 'Details must be between 10 and 5000 characters.' });

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const referenceId = `BKR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
      try {
        const complaint = await Complaint.create({ referenceId, name, email, category, subject, details });
        return res.status(201).json({ referenceId: complaint.referenceId, submittedAt: complaint.createdAt });
      } catch (error) {
        if (error?.code !== 11000 || attempt === 2) throw error;
      }
    }
  } catch (error) {
    console.error('Complaint submission failed.');
    return res.status(500).json({ message: 'Unable to submit complaint. Please try again later.' });
  }
}

export async function listComplaints(req, res) {
  try {
    const filter = ['Pending', 'In Progress', 'Resolved'].includes(req.query.status) ? { status: req.query.status } : {};
    const complaints = await Complaint.find(filter).select('referenceId name email category subject details status internalNotes resolutionMessage createdAt updatedAt').sort({ createdAt: -1 }).limit(200).lean();
    res.json(complaints);
  } catch (error) {
    console.error('Complaint list failed.');
    res.status(500).json({ message: 'Unable to load complaints.' });
  }
}

export async function updateComplaint(req, res) {
  const status = String(req.body.status || '');
  if (!['Pending', 'In Progress', 'Resolved'].includes(status)) return res.status(400).json({ message: 'Choose a valid complaint status.' });
  const updates = { status };
  if (typeof req.body.internalNotes === 'string') updates.internalNotes = cleanText(req.body.internalNotes).slice(0, 5000);
  if (typeof req.body.resolutionMessage === 'string') updates.resolutionMessage = cleanText(req.body.resolutionMessage).slice(0, 3000);
  try {
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .select('referenceId name email category subject details status internalNotes resolutionMessage createdAt updatedAt');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    res.json(complaint);
  } catch (error) {
    console.error('Complaint update failed.');
    res.status(500).json({ message: 'Unable to update complaint.' });
  }
}
