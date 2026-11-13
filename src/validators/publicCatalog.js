import { query } from 'express-validator';

export const publicCatalogValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un número entero >= 1').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe ser un número entre 1 y 100')
    .toInt(),
];
