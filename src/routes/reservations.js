import { Router } from 'express';
import {
  listReservations,
  getReservation,
  createReservation,
} from '../controllers/reservationController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import {
  listReservationsValidation,
  getReservationValidation,
  createReservationValidation
} from '../validators/reservation.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/',
  authenticate,
  listReservationsValidation,
  validate,
  listReservations
);

router.get('/:id',
  authenticate,
  getReservationValidation,
  validate,
  getReservation
);

router.post('/',
  optionalAuth,
  createReservationValidation,
  validate,
  createReservation
);

export default router;
