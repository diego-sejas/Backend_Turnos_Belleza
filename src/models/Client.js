import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  notes: { type: String, trim: true },
}, {
  timestamps: true,
});

clientSchema.index({ businessId: 1, phone: 1 }, { unique: true });
clientSchema.index({ businessId: 1, email: 1 }, { unique: true, sparse: true });

export const Client = mongoose.model('Client', clientSchema);