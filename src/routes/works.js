import { Router } from 'express';
import { listWorks, getWork, createWork, updateWork, deleteWork } from '../controllers/workController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { listWorksValidation, getWorkValidation, createWorkValidation, updateWorkValidation } from '../validators/work.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/',
  authenticate,
  listWorksValidation,
  validate,
  listWorks
);

router.get('/:id',
  authenticate,
  getWorkValidation,
  validate,
  getWork
);

router.post('/',
  authenticate,
  authorize('ADMIN'),
  createWorkValidation,
  validate,
  createWork
);

router.put('/:id',
  authenticate,
  authorize('ADMIN'),
  updateWorkValidation,
  validate,
  updateWork
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  getWorkValidation,
  validate,
  deleteWork
);

export default router;
