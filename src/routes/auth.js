import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, me, refresh } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register',
  [
    body('nombre').trim().notEmpty().withMessage('Nombre is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('rol').isIn(['ADMIN', 'PROFESIONAL']).withMessage('Role must be ADMIN or PROFESIONAL'),
  ],
  validate,
  register
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.get('/me', authenticate, me);

router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  validate,
  refresh
);

export default router;