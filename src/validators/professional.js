import { body, param, query } from 'express-validator';

export const createProfessionalValidation = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio'),
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('phone').optional().trim().isString().withMessage('El teléfono debe ser texto'),
  body('especialidades').optional().trim().isString().withMessage('Las especialidades deben ser texto'),
  body('services').optional().isArray().withMessage('Los servicios deben ser un array'),
  body('services.*').optional().isMongoId().withMessage('ID de servicio inválido'),
  body('imageId').optional({ nullable: true }).custom((value) => value === null || value === '' || value === undefined || /^[0-9a-fA-F]{24}$/.test(String(value))).withMessage('imageId inválido'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano').default(true),
];

export const updateProfessionalValidation = [
  param('id').isMongoId().withMessage('ID de profesional inválido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('apellido').optional().trim().notEmpty().withMessage('El apellido no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('phone').optional().trim().isString().withMessage('El teléfono debe ser texto'),
  body('especialidades').optional().trim().isString().withMessage('Las especialidades deben ser texto'),
  body('services').optional().isArray().withMessage('Los servicios deben ser un array'),
  body('services.*').optional().isMongoId().withMessage('ID de servicio inválido'),
  body('imageId').custom((value) => value === null || value === '' || value === undefined || /^[0-9a-fA-F]{24}$/.test(String(value))).withMessage('imageId inválido'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano'),
];

export const getProfessionalValidation = [
  param('id').isMongoId().withMessage('ID de profesional inválido'),
];

export const listProfessionalsValidation = [
  query('activeOnly').optional().isBoolean().withMessage('activeOnly debe ser booleano').toBoolean(),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un número entero >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100').toInt(),
];

export const deleteProfessionalValidation = [
  param('id').isMongoId().withMessage('ID de profesional inválido'),
];