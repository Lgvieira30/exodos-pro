import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const integrationsRouter = Router();
integrationsRouter.use(requireAuth);

integrationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const rows = await sql`
    SELECT platform, account_id, last_sync_at, last_sync_status, created_at
    FROM user_integrations WHERE user_id = ${req.userId!}
  `;
  res.json({ success: true, data: { integrations: rows } });
});

integrationsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { platform, app_id, app_secret, access_token, account_id } = req.body;
  if (!platform || !access_token || !account_id) {
    res.status(400).json({ success: false, error: { message: 'platform, access_token e account_id sao obrigatorios' } });
    return;
  }
  const [row] = await sql`
    INSERT INTO user_integrations (user_id, platform, app_id, app_secret, access_token, account_id)
    VALUES (${req.userId!}, ${platform}, ${app_id || null}, ${app_secret || null}, ${access_token}, ${account_id})
    ON CONFLICT (user_id, platform) DO UPDATE SET
      app_id = EXCLUDED.app_id, app_secret = EXCLUDED.app_secret,
      access_token = EXCLUDED.access_token, account_id = EXCLUDED.account_id,
      updated_at = NOW()
    RETURNING platform, account_id, created_at
  `;
  res.json({ success: true, data: { integration: row } });
});

integrationsRouter.delete('/:platform', async (req: AuthRequest, res: Response) => {
  await sql`DELETE FROM user_integrations WHERE user_id = ${req.userId!} AND platform = ${req.params.platform}`;
  res.json({ success: true });
});
