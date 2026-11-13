import { param, body, query } from 'express-validator';

const RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export const listReservationsValidation = [
  query('status').optional().isIn(RESERVATION_STATUSES).withMessage(`status debe ser uno de: ${RESERVATION_STATUSES.join(', ')}`),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un número entero >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100').toInt(),
];

export const getReservationValidation = [
  param('id').isMongoId().withMessage('ID de reserva inválido'),
];

export const createReservationValidation = [
  body('clientId').optional().isMongoId().withMessage('ID de cliente inválido'),
  body('phone').optional().isMobilePhone('any').withMessage('Teléfono inválido'),
  body('professionalId').isMongoId().withMessage('ID de profesional inválido'),
  body('serviceId').isMongoId().withMessage('ID de servicio inválido'),
  body('startTime').isISO8601().withMessage('startTime debe ser una fecha ISO válida').toDate(),
  body('timezone').notEmpty().withMessage('timezone es obligatorio').isString().withMessage('timezone debe ser un texto'),
  body('clientRequestId').optional().isString().withMessage('clientRequestId debe ser un texto'),
];
