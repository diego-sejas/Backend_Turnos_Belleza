import { Router } from 'express';
import { listPublicProfessionals, listPublicServices } from '../controllers/publicCatalogController.js';
import { listPublicWorks } from '../controllers/workController.js';
import { publicCatalogValidation } from '../validators/publicCatalog.js';
import { listWorksValidation } from '../validators/work.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/services', publicCatalogValidation, validate, listPublicServices);
router.get('/professionals', publicCatalogValidation, validate, listPublicProfessionals);
router.get('/works', listWorksValidation, validate, listPublicWorks);

export default router;
