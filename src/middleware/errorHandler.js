import { AppError, UnauthorizedError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (env.nodeEnv === 'development') {
    console.error('ERROR 💥:', err);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    err = new AppError(`Invalid input data: ${messages.join('. ')}`, 400, 'VALIDATION_ERROR');
  }

  if (err.name === 'CastError') {
    err = new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err = new AppError(`Duplicate field value: ${field}. Please use another value.`, 400, 'DUPLICATE_FIELD');
  }

  if (err.name === 'JsonWebTokenError') {
    err = new UnauthorizedError('Invalid token. Please log in again.');
  }

  if (err.name === 'TokenExpiredError') {
    err = new UnauthorizedError('Your token has expired. Please log in again.');
  }

  res.status(err.statusCode).json({
    status: err.status,
    code: err.code,
    message: err.message,
    ...(err.details && { details: err.details }),
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND');
  next(err);
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};