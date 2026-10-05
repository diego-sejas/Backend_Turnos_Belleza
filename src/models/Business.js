import mongoose from 'mongoose';

const businessSettingsSchema = new mongoose.Schema({
  slotGranularityMinutes: { type: Number, default: 15 },
}, { _id: false });

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  timezone: { type: String, required: true, default: 'America/Argentina/Buenos_Aires' },
  currency: { type: String, required: true, default: 'ARS' },
  settings: { type: businessSettingsSchema, default: () => ({}) },
}, {
  timestamps: true,
});

businessSchema.index({ slug: 1 }, { unique: true });

export const Business = mongoose.model('Business', businessSchema);