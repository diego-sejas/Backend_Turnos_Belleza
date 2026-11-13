import { Router } from 'express';
import { listPayments, getPaymentsSummary, getPayment } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { listPaymentsValidation, getPaymentValidation } from '../validators/payment.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/',
  authenticate,
  listPaymentsValidation,
  validate,
  listPayments
);

router.get('/summary',
  authenticate,
  getPaymentsSummary
);

router.get('/:id',
  authenticate,
  getPaymentValidation,
  validate,
  getPayment
);

export default router;
