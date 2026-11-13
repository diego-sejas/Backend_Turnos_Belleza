import mongoose from 'mongoose';

const workSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  titulo: { type: String, required: true, trim: true },
  descripcion: { type: String, trim: true },
  categoria: { type: String, trim: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional' },
  imageIds: [{ type: mongoose.Schema.Types.ObjectId }],
  fecha: { type: Date },
  isPublished: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

workSchema.index({ businessId: 1, isPublished: 1, createdAt: -1 });
workSchema.index({ businessId: 1, isActive: 1 });

export const Work = mongoose.model('Work', workSchema);
