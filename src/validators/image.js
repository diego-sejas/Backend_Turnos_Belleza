import { param } from 'express-validator';

export const imageIdValidation = [
  param('id').isMongoId().withMessage('ID de imagen inválido'),
];
