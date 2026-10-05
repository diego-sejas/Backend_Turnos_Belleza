import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/AppError.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('You are not logged in. Please log in to get access.');
    }

    const decoded = jwt.verify(token, env.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    if (err.name === 'JsonWebTokenError') return next(new UnauthorizedError('Invalid token. Please log in again.'));
    if (err.name === 'TokenExpiredError') return next(new UnauthorizedError('Your token has expired. Please log in again.'));
    next(new UnauthorizedError());
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new UnauthorizedError('You do not have permission to perform this action'));
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, env.jwt.secret);
      req.user = decoded;
    }
    next();
  } catch (err) {
    next();
  }
};