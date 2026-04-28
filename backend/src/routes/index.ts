import { Router } from 'express';
import { authRouter } from './auth.js';
import { campaignsRouter } from './campaigns.js';
import { metricsRouter } from './metrics.js';
import { syncRouter } from './sync.js';
import { analyzeRouter } from './analyze.js';
import { integrationsRouter } from './integrations.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/campaigns', campaignsRouter);
router.use('/metrics', metricsRouter);
router.use('/sync', syncRouter);
router.use('/analyze', analyzeRouter);
router.use('/integrations', integrationsRouter);
