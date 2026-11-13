import express from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import serviceRoutes from './services.js';
import professionalRoutes from './professionals.js';
import scheduleRoutes from './schedules.js';
import reservationRoutes from './reservations.js';
import clientRoutes from './clients.js';
import paymentRoutes from './payments.js';
import publicCatalogRoutes from './publicCatalog.js';
import workRoutes from './works.js';
import imageRoutes from './images.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/professionals', professionalRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/reservations', reservationRoutes);
router.use('/clients', clientRoutes);
router.use('/payments', paymentRoutes);
router.use('/works', workRoutes);
router.use('/images', imageRoutes);
router.use('/public', publicCatalogRoutes);

export default router;