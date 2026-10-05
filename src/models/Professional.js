import mongoose from 'mongoose';

const professionalSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

professionalSchema.index({ businessId: 1, isActive: 1 });

export const Professional = mongoose.model('Professional', professionalSchema);