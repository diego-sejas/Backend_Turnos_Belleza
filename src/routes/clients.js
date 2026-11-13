import { Router } from 'express';
import { listClients, getClient } from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.js';
import { listClientsValidation, getClientValidation } from '../validators/client.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/',
  authenticate,
  listClientsValidation,
  validate,
  listClients
);

router.get('/:id',
  authenticate,
  getClientValidation,
  validate,
  getClient
);

export default router;
