import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const integrationsRouter = Router();
integrationsRouter.use(requireAuth);

integrationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const rows = await sql`
      SELECT id, platform, account_id, nickname, is_active, last_sync_at, last_sync_status, created_at
      FROM user_integrations WHERE user_id = ${req.userId!}
      ORDER BY platform, is_active DESC, created_at DESC
    `;
    res.json({ success: true, data: { integrations: rows } });
  } catch (err: any) {
    console.error('GET /integrations error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Erro ao buscar integracoes' } });
  }
});

integrationsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { platform, app_id, app_secret, access_token, account_id, nickname } = req.body;
  if (!platform || !access_token || !account_id) {
    res.status(400).json({ success: false, error: { message: 'platform, access_token e account_id sao obrigatorios' } });
    return;
  }

  try {
    await sql`UPDATE user_integrations SET is_active = false WHERE user_id = ${req.userId!} AND platform = ${platform}`;

    const existing = await sql`
      SELECT id FROM user_integrations WHERE user_id = ${req.userId!} AND platform = ${platform} AND account_id = ${account_id}
    `;

    let row;
    if (existing.length > 0) {
      [row] = await sql`
        UPDATE user_integrations SET
          app_id = ${app_id || null}, app_secret = ${app_secret || null},
          access_token = ${access_token}, nickname = ${nickname || null},
          is_active = true, updated_at = NOW()
        WHERE user_id = ${req.userId!} AND platform = ${platform} AND account_id = ${account_id}
        RETURNING id, platform, account_id, nickname, is_active
      `;
    } else {
      [row] = await sql`
        INSERT INTO user_integrations (user_id, platform, app_id, app_secret, access_token, account_id, nickname, is_active)
        VALUES (${req.userId!}, ${platform}, ${app_id || null}, ${app_secret || null}, ${access_token}, ${account_id}, ${nickname || null}, true)
        RETURNING id, platform, account_id, nickname, is_active
      `;
    }

    res.json({ success: true, data: { integration: row } });
  } catch (err: any) {
    console.error('POST /integrations error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Erro ao salvar integracao' } });
  }
});

integrationsRouter.patch('/:id/activate', async (req: AuthRequest, res: Response) => {
  try {
    const [target] = await sql`
      SELECT id, platform FROM user_integrations WHERE id = ${req.params.id} AND user_id = ${req.userId!}
    `;
    if (!target) {
      res.status(404).json({ success: false, error: { message: 'Integracao nao encontrada' } });
      return;
    }

    await sql`UPDATE user_integrations SET is_active = false WHERE user_id = ${req.userId!} AND platform = ${target.platform}`;
    const [row] = await sql`
      UPDATE user_integrations SET is_active = true WHERE id = ${req.params.id}
      RETURNING id, platform, account_id, nickname, is_active
    `;
    res.json({ success: true, data: { integration: row } });
  } catch (err: any) {
    console.error('PATCH /integrations/:id/activate error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Erro ao ativar integracao' } });
  }
});

integrationsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const [deleted] = await sql`
      DELETE FROM user_integrations WHERE id = ${req.params.id} AND user_id = ${req.userId!}
      RETURNING id, platform, is_active
    `;
    if (!deleted) {
      res.status(404).json({ success: false, error: { message: 'Integracao nao encontrada' } });
      return;
    }

    if (deleted.is_active) {
      await sql`
        UPDATE user_integrations SET is_active = true
        WHERE id = (
          SELECT id FROM user_integrations
          WHERE user_id = ${req.userId!} AND platform = ${deleted.platform}
          ORDER BY created_at DESC LIMIT 1
        )
      `;
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /integrations/:id error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Erro ao remover integracao' } });
  }
});
