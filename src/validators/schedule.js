import { body, param, query } from 'express-validator';

export const listSchedulesValidation = [
  query('professionalId').optional().isMongoId().withMessage('ID de profesional inválido'),
  query('businessId').optional().isMongoId().withMessage('ID de negocio inválido'),
  query('dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('dayOfWeek debe ser entre 0 y 6').toInt(),
  query('isActive').optional().isBoolean().withMessage('isActive debe ser booleano').toBoolean(),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un número entero >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100').toInt(),
];

export const createScheduleValidation = [
  body('businessId').isMongoId().withMessage('ID de negocio inválido'),
  body('professionalId').isMongoId().withMessage('ID de profesional inválido'),
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('dayOfWeek debe ser entre 0 (domingo) y 6 (sábado)'),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('startTime debe tener formato HH:mm'),
  body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('endTime debe tener formato HH:mm'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano').default(true),
];

export const updateScheduleValidation = [
  param('id').isMongoId().withMessage('ID de horario inválido'),
  body('dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('dayOfWeek debe ser entre 0 y 6'),
  body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('startTime debe tener formato HH:mm'),
  body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('endTime debe tener formato HH:mm'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano'),
];

export const deleteScheduleValidation = [
  param('id').isMongoId().withMessage('ID de horario inválido'),
];
