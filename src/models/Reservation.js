import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'CONFIRMED',
    required: true,
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  timezone: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true },
  requiresDeposit: { type: Boolean, default: false },
  depositAmount: { type: Number, default: 0 },
  depositType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  depositPaid: { type: Boolean, default: false },
  paymentId: { type: String, trim: true },
  notes: { type: String, trim: true },
  expiresAt: { type: Date },
  confirmedAt: { type: Date },
  cancelledAt: { type: Date },
  completedAt: { type: Date },
  clientRequestId: { type: String, trim: true },
}, { timestamps: true });

reservationSchema.index({ businessId: 1, clientRequestId: 1 }, { unique: true, sparse: true });
reservationSchema.index({ businessId: 1, professionalId: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ businessId: 1, status: 1 });
reservationSchema.index({ clientId: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);
