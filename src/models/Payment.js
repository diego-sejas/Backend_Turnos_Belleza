import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'ARS' },
  status: { type: String, required: true, enum: ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'CANCELLED'], default: 'PENDING' },
  provider: { type: String, required: true, enum: ['mercadopago', 'manual', 'other'] },
  providerPaymentId: { type: String },
  providerData: { type: mongoose.Schema.Types.Mixed },
  paidAt: { type: Date },
  refundedAt: { type: Date },
}, {
  timestamps: true,
});

paymentSchema.index({ businessId: 1, reservationId: 1 }, { unique: true });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

export const Payment = mongoose.model('Payment', paymentSchema);