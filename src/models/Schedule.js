import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  startTime: { type: String, required: true, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ },
  endTime: { type: String, required: true, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

scheduleSchema.index({ businessId: 1, professionalId: 1, dayOfWeek: 1, startTime: 1, endTime: 1 }, { unique: true });
scheduleSchema.index({ professionalId: 1, dayOfWeek: 1, isActive: 1 });

export const Schedule = mongoose.model('Schedule', scheduleSchema);