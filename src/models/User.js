import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  rol: { type: String, required: true, enum: ['ADMIN', 'PROFESIONAL'] },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  activo: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now },
  ultimo_login: { type: Date },
}, {
  timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
});

userSchema.index({ email: 1 }, { unique: true });

userSchema.methods.comparePassword = async function (candidatePassword) {
  const user = await this.constructor.findById(this._id).select('+passwordHash');
  return bcrypt.compare(candidatePassword, user.passwordHash);
};

userSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, 12);
};

export const User = mongoose.model('User', userSchema);