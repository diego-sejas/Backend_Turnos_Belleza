import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  durationMinutes: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'ARS' },
  requiresDeposit: { type: Boolean, default: false },
  depositAmount: { type: Number, min: 0 },
  depositType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

serviceSchema.index({ businessId: 1, isActive: 1 });
serviceSchema.index({ businessId: 1, slug: 1 }, { unique: true });

export const Service = mongoose.model('Service', serviceSchema);