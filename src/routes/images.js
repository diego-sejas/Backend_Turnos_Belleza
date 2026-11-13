import { Router } from 'express';
import { uploadImage, serveImage, removeImage } from '../controllers/imageController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { rawImageUpload } from '../middleware/upload.js';
import { imageIdValidation } from '../validators/image.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/:id',
  imageIdValidation,
  validate,
  serveImage
);

router.post('/',
  authenticate,
  authorize('ADMIN'),
  rawImageUpload,
  uploadImage
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  imageIdValidation,
  validate,
  removeImage
);

export default router;
