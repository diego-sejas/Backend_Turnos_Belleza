import mongoose from 'mongoose';

const professionalLockSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD calendar date in business timezone
  version: { type: Number, default: 1 },
}, {
  timestamps: true,
});

professionalLockSchema.index(
  { businessId: 1, professionalId: 1, date: 1 },
  { unique: true }
);

export const ProfessionalLock = mongoose.model('ProfessionalLock', professionalLockSchema);