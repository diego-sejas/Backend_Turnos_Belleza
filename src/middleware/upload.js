import express from 'express';
import { MAX_IMAGE_BYTES } from '../services/imageService.js';
import { ValidationError } from '../utils/AppError.js';

const ALLOWED_TYPE_PATTERN = /^image\/(jpeg|png|webp)$/;

export const rawImageUpload = (req, res, next) => {
  const handler = express.raw({
    type: (req) => {
      const contentType = req.headers['content-type'] || '';
      return ALLOWED_TYPE_PATTERN.test(contentType.split(';')[0].trim());
    },
    limit: MAX_IMAGE_BYTES,
  });

  handler(req, res, (err) => {
    if (err) {
      if (err.type === 'entity.too.large') {
        return next(new ValidationError(`La imagen supera el límite de ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`));
      }
      return next(new ValidationError('No se pudo procesar la imagen recibida'));
    }

    const contentType = (req.headers['content-type'] || '').split(';')[0].trim();
    if (!ALLOWED_TYPE_PATTERN.test(contentType)) {
      return next(new ValidationError('Formato de imagen no permitido. Se aceptan JPEG, PNG o WebP'));
    }

    return next();
  });
};
