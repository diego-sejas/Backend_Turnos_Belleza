import { Router } from 'express';
import { listProfessionals, getProfessional, createProfessional, updateProfessional, deleteProfessional } from '../controllers/professionalController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { listProfessionalsValidation, getProfessionalValidation, createProfessionalValidation, updateProfessionalValidation, deleteProfessionalValidation } from '../validators/professional.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/',
  authenticate,
  listProfessionalsValidation,
  validate,
  listProfessionals
);

router.get('/:id',
  authenticate,
  getProfessionalValidation,
  validate,
  getProfessional
);

router.post('/',
  authenticate,
  authorize('ADMIN'),
  createProfessionalValidation,
  validate,
  createProfessional
);

router.put('/:id',
  authenticate,
  authorize('ADMIN'),
  updateProfessionalValidation,
  validate,
  updateProfessional
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  deleteProfessionalValidation,
  validate,
  deleteProfessional
);

export default router;