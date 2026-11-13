import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './src/config/database.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import healthRoutes from './src/routes/health.js';
import authRoutes from './src/routes/auth.js';
import { env } from './src/config/env.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.cors.origin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

await connectDB();
app.listen(3000, () => console.log('Test server running on 3000'));