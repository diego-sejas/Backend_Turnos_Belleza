import { body, param, query } from 'express-validator';

const imageIdsRule = body('imageIds')
  .optional()
  .isArray().withMessage('imageIds debe ser un array');

const imageIdItemRule = body('imageIds.*')
  .optional()
  .isMongoId().withMessage('ID de imagen inválido');

export const createWorkValidation = [
  body('titulo').trim().notEmpty().withMessage('El título es obligatorio'),
  body('descripcion').optional().trim().isString().withMessage('La descripción debe ser texto'),
  body('categoria').optional().trim().isString().withMessage('La categoría debe ser texto'),
  body('professionalId').optional({ nullable: true }).custom((value) => value === null || value === '' || value === undefined || /^[0-9a-fA-F]{24}$/.test(String(value))).withMessage('professionalId inválido'),
  imageIdsRule,
  imageIdItemRule,
  body('fecha').optional({ nullable: true }).isISO8601().withMessage('La fecha debe ser válida'),
  body('isPublished').optional().isBoolean().withMessage('isPublished debe ser booleano').default(false),
];

export const updateWorkValidation = [
  param('id').isMongoId().withMessage('ID de trabajo inválido'),
  body('titulo').optional().trim().notEmpty().withMessage('El título no puede estar vacío'),
  body('descripcion').optional().trim().isString().withMessage('La descripción debe ser texto'),
  body('categoria').optional().trim().isString().withMessage('La categoría debe ser texto'),
  body('professionalId').custom((value) => value === null || value === '' || value === undefined || /^[0-9a-fA-F]{24}$/.test(String(value))).withMessage('professionalId inválido'),
  imageIdsRule,
  imageIdItemRule,
  body('fecha').optional({ nullable: true }).isISO8601().withMessage('La fecha debe ser válida'),
  body('isPublished').optional().isBoolean().withMessage('isPublished debe ser booleano'),
];

export const getWorkValidation = [
  param('id').isMongoId().withMessage('ID de trabajo inválido'),
];

export const listWorksValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un número entero >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe ser un número entre 1 y 100').toInt(),
];
