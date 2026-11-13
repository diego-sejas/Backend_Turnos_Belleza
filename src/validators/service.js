import { body, param, query } from 'express-validator';

export const createServiceValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('description').optional().trim().isString().withMessage('La descripción debe ser texto'),
  body('durationMinutes').isInt({ min: 1 }).withMessage('La duración debe ser un número entero mayor a 0'),
  body('price').isInt({ min: 0 }).withMessage('El precio debe ser un número entero mayor o igual a 0 (en centavos)'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser código ISO 4217 de 3 letras').default('ARS'),
  body('requiresDeposit').optional().isBoolean().withMessage('requiresDeposit debe ser booleano').default(false),
  body('depositAmount').optional().isInt({ min: 0 }).withMessage('El monto del depósito debe ser un número entero mayor o igual a 0'),
  body('depositType').optional().isIn(['fixed', 'percentage']).withMessage('El tipo de depósito debe ser fixed o percentage').default('fixed'),
  body('imageId').optional({ nullable: true }).custom((value) => value === null || value === '' || value === undefined || /^[0-9a-fA-F]{24}$/.test(String(value))).withMessage('imageId inválido'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano').default(true),
];

export const updateServiceValidation = [
  param('id').isMongoId().withMessage('ID de servicio inválido'),
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('description').optional().trim().isString().withMessage('La descripción debe ser texto'),
  body('durationMinutes').optional().isInt({ min: 1 }).withMessage('La duración debe ser un número entero mayor a 0'),
  body('price').optional().isInt({ min: 0 }).withMessage('El precio debe ser un número entero mayor o igual a 0 (en centavos)'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser código ISO 4217 de 3 letras'),
  body('requiresDeposit').optional().isBoolean().withMessage('requiresDeposit debe ser booleano'),
  body('depositAmount').optional().isInt({ min: 0 }).withMessage('El monto del depósito debe ser un número entero mayor o igual a 0'),
  body('depositType').optional().isIn(['fixed', 'percentage']).withMessage('El tipo de depósito debe ser fixed o percentage'),
  body('imageId').custom((value) => value === null || value === '' || value === undefined || /^[0-9a-fA-F]{24}$/.test(String(value))).withMessage('imageId inválido'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano'),
];

export const getServiceValidation = [
  param('id').isMongoId().withMessage('ID de servicio inválido'),
];

export const listServicesValidation = [
  query('activeOnly').optional().isBoolean().withMessage('activeOnly debe ser booleano').toBoolean(),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un número entero >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100').toInt(),
];

export const deleteServiceValidation = [
  param('id').isMongoId().withMessage('ID de servicio inválido'),
];