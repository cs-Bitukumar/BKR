import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  referenceId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, maxlength: 254, lowercase: true, trim: true },
  category: { type: String, required: true, enum: ['account', 'wallet', 'game', 'abuse', 'privacy', 'other'] },
  subject: { type: String, required: true, maxlength: 160 },
  details: { type: String, required: true, maxlength: 5000 },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
  internalNotes: { type: String, default: '', maxlength: 5000 },
  resolutionMessage: { type: String, default: '', maxlength: 3000 },
}, { timestamps: true });

export default mongoose.model('Complaint', complaintSchema);
