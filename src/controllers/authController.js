import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { UnauthorizedError, ConflictError, ValidationError } from '../utils/AppError.js';

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.rol, businessId: user.businessId },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

const formatUserResponse = (user) => ({
  id: user._id,
  nombre: user.nombre,
  email: user.email,
  rol: user.rol,
  businessId: user.businessId,
  activo: user.activo,
  fecha_creacion: user.fecha_creacion,
  ultimo_login: user.ultimo_login,
});

export const register = asyncHandler(async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password || !rol) {
    throw new ValidationError('All fields are required: nombre, email, password, rol');
  }

  const validRoles = ['ADMIN', 'PROFESIONAL'];
  if (!validRoles.includes(rol)) {
    throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    nombre,
    email,
    passwordHash,
    rol,
    activo: true,
  });

  const { accessToken, refreshToken } = generateTokens(user);

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.activo) {
    throw new UnauthorizedError('Account is deactivated');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  user.ultimo_login = new Date();
  await user.save();

  const { accessToken, refreshToken } = generateTokens(user);

  res.json({
    status: 'success',
    message: 'Login successful',
    data: {
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (!user.activo) {
    throw new UnauthorizedError('Account is deactivated');
  }

  res.json({
    status: 'success',
    data: formatUserResponse(user),
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.activo) {
    throw new UnauthorizedError('User not found or deactivated');
  }

  const tokens = generateTokens(user);

  res.json({
    status: 'success',
    data: tokens,
  });
});