import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  channel: { type: String, required: true, enum: ['whatsapp', 'email', 'sms', 'push'] },
  template: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, required: true, enum: ['pending', 'sent', 'failed', 'delivered', 'read'], default: 'pending' },
  provider: { type: String },
  providerMessageId: { type: String },
  error: { type: String },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  scheduledAt: { type: Date, required: true },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  readAt: { type: Date },
}, {
  timestamps: true,
});

notificationSchema.index({ businessId: 1, status: 1, scheduledAt: 1 });
notificationSchema.index({ reservationId: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);