import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  status: { type: String, required: true, enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], default: 'PENDING' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  timezone: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  requiresDeposit: { type: Boolean, default: false },
  depositAmount: { type: Number, min: 0 },
  depositPaid: { type: Boolean, default: false },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  notes: { type: String, trim: true },
  expiresAt: { type: Date },
  confirmedAt: { type: Date },
  cancelledAt: { type: Date },
  completedAt: { type: Date },
}, {
  timestamps: true,
});

reservationSchema.index({ businessId: 1, professionalId: 1, startTime: 1 });
reservationSchema.index({ businessId: 1, clientId: 1, startTime: 1 });
reservationSchema.index({ businessId: 1, status: 1, startTime: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);