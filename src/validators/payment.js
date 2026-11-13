import { param, query } from 'express-validator';

const PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'CANCELLED'];

export const listPaymentsValidation = [
  query('status').optional().isIn(PAYMENT_STATUSES).withMessage(`status debe ser uno de: ${PAYMENT_STATUSES.join(', ')}`),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un número entero >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100').toInt(),
];

export const getPaymentValidation = [
  param('id').isMongoId().withMessage('ID de pago inválido'),
];
