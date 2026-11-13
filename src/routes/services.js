import { Router } from 'express';
import { listServices, getService, createService, updateService, deleteService } from '../controllers/serviceController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { listServicesValidation, getServiceValidation, createServiceValidation, updateServiceValidation, deleteServiceValidation } from '../validators/service.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/',
  authenticate,
  listServicesValidation,
  validate,
  listServices
);

router.get('/:id',
  authenticate,
  getServiceValidation,
  validate,
  getService
);

router.post('/',
  authenticate,
  authorize('ADMIN'),
  createServiceValidation,
  validate,
  createService
);

router.put('/:id',
  authenticate,
  authorize('ADMIN'),
  updateServiceValidation,
  validate,
  updateService
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  deleteServiceValidation,
  validate,
  deleteService
);

export default router;