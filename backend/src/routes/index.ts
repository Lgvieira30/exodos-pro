import { Router } from 'express';
import { authRouter } from './auth.js';
import { campaignsRouter } from './campaigns.js';
import { metricsRouter } from './metrics.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/campaigns', campaignsRouter);
router.use('/metrics', metricsRouter);
