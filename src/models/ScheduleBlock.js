import mongoose from 'mongoose';

const scheduleBlockSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  type: { type: String, required: true, enum: ['BREAK', 'VACATION', 'HOLIDAY', 'MEETING', 'MAINTENANCE', 'MANUAL'] },
  reason: { type: String, trim: true },
}, {
  timestamps: true,
});

scheduleBlockSchema.index({ businessId: 1, professionalId: 1, startTime: 1, endTime: 1 });
scheduleBlockSchema.index({ professionalId: 1, startTime: 1, endTime: 1 });

export const ScheduleBlock = mongoose.model('ScheduleBlock', scheduleBlockSchema);