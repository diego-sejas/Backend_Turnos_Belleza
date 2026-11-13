import { Router } from 'express';
import {
  listSchedules,
  getSchedulesByProfessional,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/scheduleController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listSchedulesValidation,
  createScheduleValidation,
  updateScheduleValidation,
  deleteScheduleValidation,
} from '../validators/schedule.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/',
  authenticate,
  listSchedulesValidation,
  validate,
  listSchedules
);

router.get('/professional/:professionalId',
  authenticate,
  getSchedulesByProfessional
);

router.post('/',
  authenticate,
  authorize('ADMIN'),
  createScheduleValidation,
  validate,
  createSchedule
);

router.put('/:id',
  authenticate,
  authorize('ADMIN'),
  updateScheduleValidation,
  validate,
  updateSchedule
);

router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  deleteScheduleValidation,
  validate,
  deleteSchedule
);

export default router;
